/* ------------------------------------------------------------------
   Adaptateur CLOUD (Supabase) : c'est lui qui permet d'ecrire a deux.

   - Une seule table `items` : { space, collection, id, data jsonb }
     -> une seule souscription temps reel couvre tout le site.
   - Les photos vont dans le bucket Storage `media`, qui est PRIVE :
     on ne sert que des URLs signees, valables quelques heures.
   - Tout est ferme aux visiteurs non connectes : les policies exigent
     un `auth.uid()`, et cet adaptateur ne charge rien tant que la
     session n'est pas ouverte.
   ------------------------------------------------------------------ */

import {
  createClient,
  type RealtimeChannel,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js'
import type { CollectionName, DB, MediaRef } from '../types'
import { groupIntoDB, type Adapter, type AuthCapability, type AuthUser, type ChangeEvent } from './adapter'
import { uid } from '../../lib/utils'

const TABLE = 'items'
const BUCKET = 'media'

/** Duree de validite d'une URL de photo (4 h) et marge de renouvellement. */
const SIGNED_TTL_SECONDS = 4 * 3600
const SIGNED_REFRESH_MARGIN_MS = 30 * 60 * 1000

export interface CloudConfig {
  url: string
  anonKey: string
  space: string
}

const toUser = (session: Session | null): AuthUser | null =>
  session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null

/** Messages Supabase traduits : « Invalid login credentials » n'aide personne. */
function frenchAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Adresse e-mail ou mot de passe incorrect.'
  if (m.includes('email not confirmed')) return "Ce compte n'a pas encore été confirmé."
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Réessayez dans quelques minutes.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Pas de connexion au serveur.'
  return message
}

export class CloudAdapter implements Adapter {
  readonly kind = 'cloud' as const
  readonly label = 'Partagé'
  readonly auth: AuthCapability

  private client: SupabaseClient
  private channel: RealtimeChannel | null = null
  private handlers = new Set<(e: ChangeEvent) => void>()
  private authHandlers = new Set<(user: AuthUser | null) => void>()
  private space: string
  private user: AuthUser | null = null
  /** id de l'utilisateur pour lequel le canal temps reel est ouvert */
  private channelFor: string | null = null
  private urlCache = new Map<string, { url: string; expiresAt: number }>()

  constructor(config: CloudConfig) {
    this.space = config.space || 'nous'
    this.client = createClient(config.url, config.anonKey, {
      realtime: { params: { eventsPerSecond: 20 } },
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })

    this.auth = {
      current: async () => {
        const { data } = await this.client.auth.getSession()
        this.user = toUser(data.session)
        return this.user
      },
      onChange: (handler) => {
        this.authHandlers.add(handler)
        return () => this.authHandlers.delete(handler)
      },
      signIn: async (email, password) => {
        const { error } = await this.client.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw new Error(frenchAuthError(error.message))
      },
      signOut: async () => {
        // scope 'local' : on ne deconnecte QUE cet appareil. Par defaut
        // Supabase deconnecte toutes les sessions du compte — se
        // deconnecter de son PC ejecterait aussi son telephone.
        await this.client.auth.signOut({ scope: 'local' })
        // Les URLs signees ne doivent pas survivre a la deconnexion.
        this.urlCache.clear()
      },
    }
  }

  async init(): Promise<void> {
    const { data } = await this.client.auth.getSession()
    this.user = toUser(data.session)

    this.client.auth.onAuthStateChange((_event, session) => {
      const next = toUser(session)
      const changed = next?.id !== this.user?.id
      this.user = next

      if (changed) {
        this.authHandlers.forEach((h) => h(next))
        if (next) {
          this.openChannel()
          this.emit({ type: 'reload' })
        } else {
          this.closeChannel()
          this.urlCache.clear()
        }
      }
    })

    if (this.user) this.openChannel()
    else this.emit({ type: 'status', state: 'idle' })

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      document.addEventListener('visibilitychange', this.handleVisibility)
    }
  }

  private handleOnline = () => {
    if (this.user) this.emit({ type: 'reload' })
  }
  private handleVisibility = () => {
    if (document.visibilityState === 'visible' && this.user) this.emit({ type: 'reload' })
  }

  /* ------------------------------ Temps réel ------------------------------ */

  private openChannel() {
    if (!this.user) return
    if (this.channelFor === this.user.id && this.channel) return

    this.closeChannel()
    this.channelFor = this.user.id
    this.emit({ type: 'status', state: 'connecting' })

    this.channel = this.client
      .channel(`space:${this.space}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE, filter: `space=eq.${this.space}` },
        (payload) => this.onRemoteChange(payload),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') this.emit({ type: 'status', state: 'live' })
        else if (status === 'CHANNEL_ERROR')
          this.emit({ type: 'status', state: 'error', detail: 'Canal temps réel indisponible' })
        else if (status === 'TIMED_OUT' || status === 'CLOSED')
          this.emit({ type: 'status', state: 'offline' })
      })
  }

  private closeChannel() {
    if (this.channel) {
      void this.client.removeChannel(this.channel)
      this.channel = null
    }
    this.channelFor = null
    this.emit({ type: 'status', state: 'idle' })
  }

  private onRemoteChange(payload: {
    eventType: string
    new: Record<string, unknown> | null
    old: Record<string, unknown> | null
  }) {
    if (payload.eventType === 'DELETE') {
      const old = payload.old
      if (old?.collection && old?.id) {
        this.emit({ type: 'delete', collection: old.collection as CollectionName, id: String(old.id) })
      } else {
        this.emit({ type: 'reload' })
      }
      return
    }
    const row = payload.new
    if (row?.collection && row?.data) {
      this.emit({
        type: 'upsert',
        collection: row.collection as CollectionName,
        item: row.data as Record<string, unknown>,
      })
    }
  }

  /* ------------------------------- Données ------------------------------- */

  async loadAll(): Promise<DB> {
    // Sans session, il n'y a rien a montrer : les policies refuseraient
    // de toute facon. On evite un aller-retour inutile.
    if (!this.user) return groupIntoDB([])

    const rows: { collection: string; data: Record<string, unknown> }[] = []
    const pageSize = 1000
    let from = 0

    for (;;) {
      const { data, error } = await this.client
        .from(TABLE)
        .select('collection, data')
        .eq('space', this.space)
        .range(from, from + pageSize - 1)

      if (error) throw new Error(error.message)
      rows.push(...((data ?? []) as { collection: string; data: Record<string, unknown> }[]))
      if (!data || data.length < pageSize) break
      from += pageSize
    }

    return groupIntoDB(rows)
  }

  async put(collection: CollectionName, item: Record<string, unknown>): Promise<void> {
    const { error } = await this.client.from(TABLE).upsert(
      {
        space: this.space,
        collection,
        id: String(item.id),
        data: item,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'space,collection,id' },
    )
    if (error) throw new Error(error.message)
  }

  async remove(collection: CollectionName, id: string): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .delete()
      .eq('space', this.space)
      .eq('collection', collection)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  subscribe(handler: (event: ChangeEvent) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  /* -------------------------------- Photos -------------------------------- */

  async uploadMedia(blob: Blob, filename: string): Promise<MediaRef> {
    const ext = (filename.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${this.space}/${uid()}.${ext}`

    const { error } = await this.client.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    })
    if (error) throw new Error(`Envoi de l'image impossible : ${error.message}`)
    return `cloud:${path}`
  }

  /**
   * Le bucket etant prive, on signe une URL temporaire. On la garde en
   * cache jusqu'a 30 min avant son expiration : les images deja affichees
   * continuent de s'afficher, et les nouveaux rendus obtiennent un lien
   * frais sans qu'on ait a y penser.
   */
  async mediaURL(ref: MediaRef): Promise<string | null> {
    if (!ref) return null
    if (ref.startsWith('data:') || ref.startsWith('http')) return ref
    if (!ref.startsWith('cloud:')) return null

    const cached = this.urlCache.get(ref)
    if (cached && cached.expiresAt > Date.now()) return cached.url

    const { data, error } = await this.client.storage
      .from(BUCKET)
      .createSignedUrl(ref.slice(6), SIGNED_TTL_SECONDS)

    if (error || !data?.signedUrl) return null

    this.urlCache.set(ref, {
      url: data.signedUrl,
      expiresAt: Date.now() + SIGNED_TTL_SECONDS * 1000 - SIGNED_REFRESH_MARGIN_MS,
    })
    return data.signedUrl
  }

  async deleteMedia(ref: MediaRef): Promise<void> {
    if (!ref?.startsWith('cloud:')) return
    this.urlCache.delete(ref)
    await this.client.storage.from(BUCKET).remove([ref.slice(6)])
  }

  private emit(e: ChangeEvent) {
    this.handlers.forEach((h) => h(e))
  }

  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      document.removeEventListener('visibilitychange', this.handleVisibility)
    }
    this.closeChannel()
    this.handlers.clear()
    this.authHandlers.clear()
    this.urlCache.clear()
  }
}

/**
 * Lit la configuration cloud dans les variables d'environnement.
 *
 * Supabase a renomme la cle publique : les anciens projets affichent
 * « anon public » (un JWT `eyJ...`), les nouveaux « publishable key »
 * (`sb_publishable_...`). Les deux fonctionnent avec supabase-js, donc on
 * accepte les deux noms de variable — c'est le genre de detail qui fait
 * perdre une demi-heure quand on ne le prevoit pas.
 */
export function readCloudConfig(): CloudConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '')
  const anonKey = (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim()
  const space = import.meta.env.VITE_SPACE_ID?.trim() || 'nous'

  if (!url || !anonKey) return null

  // Valeurs d'exemple laissees en place : on reste en mode local.
  if (url.includes('xxxxxxxx') || anonKey.startsWith('eyJhbGciOi....')) return null

  // Garde-fou : la cle `service_role` contourne toutes les securites et
  // n'a rien a faire dans du code envoye aux navigateurs.
  if (anonKey.startsWith('sb_secret_') || anonKey.includes('service_role')) {
    console.error(
      "[Nous] La clé fournie est une clé secrète (service_role). Utilisez la clé « anon public » " +
        '/ « publishable ». Le site reste en mode local par sécurité.',
    )
    return null
  }

  return { url, anonKey, space }
}
