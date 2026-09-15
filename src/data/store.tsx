/* ------------------------------------------------------------------
   Store global : un seul endroit qui parle a l'adaptateur.

   Les pages n'appellent jamais IndexedDB ni Supabase directement : elles
   utilisent useCollection() / useSettings(). C'est ce qui rend le
   basculement local <-> cloud transparent.
   ------------------------------------------------------------------ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  COLLECTIONS,
  DEFAULT_SETTINGS,
  emptyDB,
  type CollectionName,
  type DB,
  type MediaRef,
  type Person,
  type Settings,
} from './types'
import type { Adapter, AuthUser, ChangeEvent, SyncState } from './adapters/adapter'
import { LocalAdapter } from './adapters/local'
import { CloudAdapter, readCloudConfig } from './adapters/cloud'
import { compressImage, safeName } from './media'
import { clearMediaCache } from '../components/ui/Img'
import { nowISO, uid } from '../lib/utils'

/* ------------------------------ Types ------------------------------ */

export interface Toast {
  id: string
  message: string
  tone: 'info' | 'success' | 'error'
}

interface StoreValue {
  db: DB
  ready: boolean
  /** Échec du dernier chargement. Non nul = les données affichées ne sont pas fiables. */
  loadError: string | null
  adapter: Adapter
  syncKind: 'local' | 'cloud'
  syncState: SyncState

  settings: Settings
  saveSettings: (patch: Partial<Settings>) => Promise<void>

  create: <K extends CollectionName>(
    name: K,
    data: Partial<DB[K][number]>,
  ) => Promise<DB[K][number]>
  update: <K extends CollectionName>(
    name: K,
    id: string,
    patch: Partial<DB[K][number]>,
  ) => Promise<void>
  remove: (name: CollectionName, id: string) => Promise<void>
  /** Met a jour l'etat local sans ecrire (glisser-deposer fluide). */
  patchLocal: <K extends CollectionName>(name: K, id: string, patch: Partial<DB[K][number]>) => void

  uploadImage: (file: File) => Promise<MediaRef>
  mediaURL: (ref: MediaRef) => Promise<string | null>
  deleteMedia: (ref: MediaRef) => Promise<void>

  me: Person | null
  setMe: (personId: string) => void

  /** Connexion : `authRequired` est faux en mode local (pas de compte). */
  authRequired: boolean
  authChecked: boolean
  user: AuthUser | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>

  toasts: Toast[]
  notify: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void

  reload: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

const ME_KEY = 'nous.me'

/* --------------------------- Fournisseur --------------------------- */

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDB)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [meId, setMeId] = useState<string | null>(() => localStorage.getItem(ME_KEY))
  const [toasts, setToasts] = useState<Toast[]>([])
  const [user, setUser] = useState<AuthUser | null>(null)
  /** true dès qu'on sait s'il y a une session ou non (évite un flash) */
  const [authChecked, setAuthChecked] = useState(false)

  // L'adaptateur est choisi une fois pour toutes au demarrage.
  const adapter = useMemo<Adapter>(() => {
    const cloud = readCloudConfig()
    if (cloud) {
      try {
        return new CloudAdapter(cloud)
      } catch {
        return new LocalAdapter()
      }
    }
    return new LocalAdapter()
  }, [])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = uid()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3200)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  /* ------------------------- Application d'un patch ------------------------- */

  const applyChange = useCallback((e: ChangeEvent) => {
    if (e.type === 'status') {
      setSyncState(e.state)
      return
    }
    if (e.type === 'upsert') {
      setDb((prev) => {
        const list = prev[e.collection] as unknown as Record<string, unknown>[]
        const idx = list.findIndex((x) => x.id === e.item.id)
        const next = idx >= 0
          ? list.map((x, i) => (i === idx ? e.item : x))
          : [...list, e.item]
        return { ...prev, [e.collection]: next } as DB
      })
      return
    }
    if (e.type === 'delete') {
      setDb((prev) => ({
        ...prev,
        [e.collection]: (prev[e.collection] as unknown as Record<string, unknown>[]).filter((x) => x.id !== e.id),
      }) as DB)
    }
  }, [])

  const reload = useCallback(async () => {
    try {
      const fresh = await adapter.loadAll()
      setDb(fresh)
      setLoadError(null)
      setReady(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chargement impossible'
      setLoadError(message)
      setReady(true)
      // Un échec silencieux laisserait croire que tout est à jour alors
      // qu'on affiche des données périmées.
      notify(`Mise à jour impossible : ${message}`, 'error')
    }
  }, [adapter, notify])

  const reloadRef = useRef(reload)
  reloadRef.current = reload

  /* ------------------------------ Demarrage ------------------------------ */

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    let unsubscribeAuth: (() => void) | undefined

    ;(async () => {
      try {
        await adapter.init()

        unsubscribe = adapter.subscribe((e) => {
          if (cancelled) return
          if (e.type === 'reload') void reloadRef.current()
          else applyChange(e)
        })

        // Adaptateur qui exige une connexion (cloud) : on n'appelle pas
        // loadAll() tant que personne n'est connecte, sinon on affiche un
        // site vide qui ressemble a une perte de donnees.
        if (adapter.auth) {
          unsubscribeAuth = adapter.auth.onChange((next) => {
            if (cancelled) return
            setUser(next)
            if (next) {
              // Le rechargement est declenche par l'adaptateur ('reload').
              setReady(false)
            } else {
              setDb(emptyDB())
              setReady(true)
            }
          })

          const current = await adapter.auth.current()
          if (cancelled) return
          setUser(current)
          setAuthChecked(true)

          if (!current) {
            setReady(true)
            return
          }
        } else {
          setAuthChecked(true)
        }

        const fresh = await adapter.loadAll()
        if (cancelled) return
        setDb(fresh)
        setLoadError(null)
        setReady(true)
      } catch (err) {
        if (cancelled) return
        // On note l'échec SANS toucher à `db`. C'est `loadError` qui
        // empêchera l'app de confondre « rien chargé » et « base vide ».
        setLoadError(err instanceof Error ? err.message : 'Démarrage impossible')
        setAuthChecked(true)
        setReady(true)
      }
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
      unsubscribeAuth?.()
      adapter.dispose?.()
    }
  }, [adapter, applyChange])

  /* ------------------------------ Ecriture ------------------------------ */

  const writeItem = useCallback(
    async (name: CollectionName, item: Record<string, unknown>) => {
      // Optimiste : on affiche tout de suite, on ecrit ensuite.
      applyChange({ type: 'upsert', collection: name, item })
      try {
        await adapter.put(name, item)
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Enregistrement impossible', 'error')
        void reloadRef.current()
      }
    },
    [adapter, applyChange, notify],
  )

  const create = useCallback(
    async <K extends CollectionName>(name: K, data: Partial<DB[K][number]>) => {
      const item = {
        id: uid(),
        createdAt: nowISO(),
        updatedAt: nowISO(),
        authorId: meId ?? undefined,
        ...(data as Record<string, unknown>),
      }
      await writeItem(name, item)
      return item as DB[K][number]
    },
    [writeItem, meId],
  )

  const update = useCallback(
    async <K extends CollectionName>(name: K, id: string, patch: Partial<DB[K][number]>) => {
      const current = (db[name] as unknown as Record<string, unknown>[]).find((x) => x.id === id)
      const item = {
        ...(current ?? { id, createdAt: nowISO() }),
        ...(patch as Record<string, unknown>),
        id,
        updatedAt: nowISO(),
      }
      await writeItem(name, item)
    },
    [db, writeItem],
  )

  const remove = useCallback(
    async (name: CollectionName, id: string) => {
      applyChange({ type: 'delete', collection: name, id })
      try {
        await adapter.remove(name, id)
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Suppression impossible', 'error')
        void reloadRef.current()
      }
    },
    [adapter, applyChange, notify],
  )

  const patchLocal = useCallback(
    <K extends CollectionName>(name: K, id: string, patch: Partial<DB[K][number]>) => {
      setDb((prev) => ({
        ...prev,
        [name]: (prev[name] as unknown as Record<string, unknown>[]).map((x) =>
          x.id === id ? { ...x, ...(patch as Record<string, unknown>) } : x,
        ),
      }) as DB)
    },
    [],
  )

  /* ------------------------------ Reglages ------------------------------ */

  const settings = useMemo<Settings>(() => {
    const stored = db.settings[0]
    if (!stored) return DEFAULT_SETTINGS
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      people: stored.people?.length ? stored.people : DEFAULT_SETTINGS.people,
      criteria: stored.criteria?.length ? stored.criteria : DEFAULT_SETTINGS.criteria,
      milestones: stored.milestones ?? [],
    }
  }, [db.settings])

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      // Ceinture et bretelles : si le chargement a échoué, `settings` vaut
      // les valeurs par défaut. Écrire ici remplacerait les vrais réglages
      // du couple par du vide — et le temps réel propagerait la casse.
      if (loadError && !db.settings[0]) {
        notify("Données non chargées : enregistrement annulé pour ne rien écraser.", 'error')
        throw new Error('Chargement en échec, écriture bloquée')
      }
      await writeItem('settings', {
        ...settings,
        ...patch,
        id: 'main',
        createdAt: settings.createdAt || nowISO(),
        updatedAt: nowISO(),
      })
    },
    [settings, writeItem, loadError, db.settings, notify],
  )

  /* -------------------------------- Media -------------------------------- */

  const uploadImage = useCallback(
    async (file: File) => {
      const blob = await compressImage(file)
      return adapter.uploadMedia(blob, safeName(file))
    },
    [adapter],
  )

  const mediaURL = useCallback((ref: MediaRef) => adapter.mediaURL(ref), [adapter])
  const deleteMedia = useCallback((ref: MediaRef) => adapter.deleteMedia(ref), [adapter])

  /* --------------------------------- Moi --------------------------------- */

  const me = useMemo(
    () => settings.people.find((p) => p.id === meId) ?? null,
    [settings.people, meId],
  )

  const setMe = useCallback((personId: string) => {
    localStorage.setItem(ME_KEY, personId)
    setMeId(personId)
  }, [])

  /* ----------------------------- Connexion ----------------------------- */

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!adapter.auth) return
      await adapter.auth.signIn(email, password)
    },
    [adapter],
  )

  const signOut = useCallback(async () => {
    if (!adapter.auth) return
    await adapter.auth.signOut()
    setUser(null)
    setDb(emptyDB())
    // Les URLs signées déjà obtenues ne doivent pas rester accessibles.
    clearMediaCache()
    // « Qui écrit » est propre à l'appareil, mais après une déconnexion
    // volontaire il vaut mieux le redemander : on peut prêter son téléphone.
    localStorage.removeItem(ME_KEY)
    setMeId(null)
  }, [adapter])

  /* -------------------------------- Theme -------------------------------- */

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const resolved =
        settings.theme === 'auto' ? (media.matches ? 'dark' : 'light') : settings.theme
      root.setAttribute('data-theme', resolved)
    }

    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings.theme])

  /* -------------------------------- Palette -------------------------------- */

  useEffect(() => {
    const root = document.documentElement
    const next = settings.palette ?? 'automne'
    if (root.getAttribute('data-palette') === next) return

    // Au tout premier rendu on bascule sans animer : on ne veut voir le
    // fondu que lorsque la palette change vraiment sous les yeux.
    const premierRendu = !root.hasAttribute('data-palette')
    if (premierRendu) {
      root.setAttribute('data-palette', next)
      return
    }

    root.classList.add('palette-switching')
    root.setAttribute('data-palette', next)
    const id = setTimeout(() => root.classList.remove('palette-switching'), 1300)
    return () => clearTimeout(id)
  }, [settings.palette])

  const value = useMemo<StoreValue>(
    () => ({
      db,
      ready,
      loadError,
      adapter,
      syncKind: adapter.kind,
      syncState,
      settings,
      saveSettings,
      create,
      update,
      remove,
      patchLocal,
      uploadImage,
      mediaURL,
      deleteMedia,
      me,
      setMe,
      authRequired: !!adapter.auth,
      authChecked,
      user,
      signIn,
      signOut,
      toasts,
      notify,
      dismissToast,
      reload,
    }),
    [
      db, ready, loadError, adapter, syncState, settings, saveSettings, create, update, remove,
      patchLocal, uploadImage, mediaURL, deleteMedia, me, setMe, authChecked, user, signIn,
      signOut, toasts, notify, dismissToast, reload,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

/* ------------------------------- Hooks ------------------------------- */

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>')
  return ctx
}

export function useSettings() {
  const { settings, saveSettings } = useStore()
  return [settings, saveSettings] as const
}

export function useCollection<K extends CollectionName>(name: K) {
  const store = useStore()
  const items = store.db[name]

  return useMemo(
    () => ({
      items,
      create: (data: Partial<DB[K][number]>) => store.create(name, data),
      update: (id: string, patch: Partial<DB[K][number]>) => store.update(name, id, patch),
      remove: (id: string) => store.remove(name, id),
      patchLocal: (id: string, patch: Partial<DB[K][number]>) => store.patchLocal(name, id, patch),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, name, store.create, store.update, store.remove, store.patchLocal],
  )
}

/** Retrouve une personne par son id (auteur d'une entree). */
export function usePerson(personId?: string): Person | null {
  const [settings] = useSettings()
  return settings.people.find((p) => p.id === personId) ?? null
}

/** Toutes les collections, pour l'export/sauvegarde. */
export function useExport() {
  const { db } = useStore()
  return useCallback(() => {
    const out: Record<string, unknown> = { exportedAt: nowISO(), version: 1 }
    COLLECTIONS.forEach((c) => (out[c] = db[c]))
    return out
  }, [db])
}
