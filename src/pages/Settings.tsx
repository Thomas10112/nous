import { useEffect, useState } from 'react'
import { useStore } from '../data/store'
import { COLLECTIONS, DEFAULT_CRITERIA, type Criterion, type Person } from '../data/types'
import { Icon } from '../components/ui/Icon'
import { Avatar, Button, Chip, PageHeader, Segmented } from '../components/ui/primitives'
import { useConfirm } from '../components/ui/Modal'
import { ColorInput, DateInput, Field, Input, NumberInput } from '../components/ui/form'
import { SinglePhotoInput } from '../components/ui/Img'
import { LocalAdapter } from '../data/adapters/local'
import { storageEstimate } from '../data/idb'
import { formatBytes } from '../data/media'
import { downloadJSON, uid } from '../lib/utils'
import { formatDate } from '../lib/date'
import Proposal from './Proposal'

export default function SettingsPage() {
  const store = useStore()
  const { settings, saveSettings, db, adapter, syncKind, syncState, notify, reload, authRequired } =
    store
  const { confirm, node: confirmNode } = useConfirm()
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null)
  const [migrating, setMigrating] = useState(false)
  const [previewProposal, setPreviewProposal] = useState(false)

  useEffect(() => {
    void storageEstimate().then(setUsage)
  }, [db])

  const totalItems = COLLECTIONS.reduce((n, c) => n + db[c].length, 0)

  /* ------------------------------- Personnes ------------------------------- */

  const setPerson = (id: string, patch: Partial<Person>) =>
    void saveSettings({
      people: settings.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })

  /* -------------------------------- Critères -------------------------------- */

  const setCriterion = (id: string, patch: Partial<Criterion>) =>
    void saveSettings({
      criteria: settings.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })

  const addCriterion = () =>
    void saveSettings({
      criteria: [...settings.criteria, { id: uid().slice(0, 8), label: 'Nouveau critère', weight: 1 }],
    })

  const removeCriterion = (id: string) =>
    void saveSettings({ criteria: settings.criteria.filter((c) => c.id !== id) })

  /* ------------------------------ Sauvegarde ------------------------------ */

  const exportAll = () => {
    const payload: Record<string, unknown> = {
      app: 'nous',
      version: 1,
      exportedAt: new Date().toISOString(),
    }
    COLLECTIONS.forEach((c) => (payload[c] = db[c]))
    downloadJSON(payload, `nous-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`)
    notify('Sauvegarde téléchargée', 'success')
  }

  const importAll = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const data = JSON.parse(await file.text()) as Record<string, unknown>
        const ok = await confirm({
          title: 'Restaurer cette sauvegarde ?',
          message:
            'Les entrées du fichier seront ajoutées ou mises à jour. Les photos ne sont pas incluses dans le fichier JSON.',
          confirmLabel: 'Restaurer',
        })
        if (!ok) return

        let count = 0
        for (const c of COLLECTIONS) {
          const list = data[c]
          if (!Array.isArray(list)) continue
          for (const item of list as Record<string, unknown>[]) {
            if (!item?.id) continue
            await adapter.put(c, item)
            count++
          }
        }
        await reload()
        notify(`${count} entrées restaurées`, 'success')
      } catch {
        notify('Fichier illisible', 'error')
      }
    }
    input.click()
  }

  /* -------------------- Migration des photos locales -------------------- */

  const migrateMedia = async () => {
    if (syncKind !== 'cloud') return
    const local = new LocalAdapter()
    await local.init()

    // On repere toutes les references "local:" encore utilisees.
    const refs = new Set<string>()
    const scan = (v: unknown) => {
      if (typeof v === 'string' && v.startsWith('local:')) refs.add(v)
      else if (Array.isArray(v)) v.forEach(scan)
      else if (v && typeof v === 'object') Object.values(v).forEach(scan)
    }
    COLLECTIONS.forEach((c) => db[c].forEach(scan))

    if (!refs.size) {
      notify('Aucune photo locale à transférer', 'success')
      return
    }

    const ok = await confirm({
      title: `Transférer ${refs.size} photo${refs.size > 1 ? 's' : ''} ?`,
      message:
        'Elles sont pour l’instant stockées uniquement sur cet appareil. Après transfert, l’autre personne pourra les voir.',
      confirmLabel: 'Transférer',
    })
    if (!ok) return

    setMigrating(true)
    try {
      const mapping = new Map<string, string>()
      for (const ref of refs) {
        const blob = await local.getBlob(ref)
        if (!blob) continue
        mapping.set(ref, await adapter.uploadMedia(blob.blob, blob.name))
      }

      // On reecrit les references dans toutes les entrees concernees.
      const rewrite = (v: unknown): unknown => {
        if (typeof v === 'string') return mapping.get(v) ?? v
        if (Array.isArray(v)) return v.map(rewrite)
        if (v && typeof v === 'object') {
          return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, rewrite(val)]))
        }
        return v
      }

      let touched = 0
      for (const c of COLLECTIONS) {
        for (const item of db[c] as unknown as Record<string, unknown>[]) {
          const next = rewrite(item) as Record<string, unknown>
          if (JSON.stringify(next) !== JSON.stringify(item)) {
            await adapter.put(c, next)
            touched++
          }
        }
      }
      await reload()
      notify(`${mapping.size} photos transférées, ${touched} entrées mises à jour`, 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Transfert impossible', 'error')
    } finally {
      setMigrating(false)
      local.dispose()
    }
  }

  /* -------------------------------- Effacement -------------------------------- */

  const wipe = async () => {
    const ok = await confirm({
      title: 'Tout effacer ?',
      message: `Les ${totalItems} entrées seront supprimées définitivement. Pensez à faire une sauvegarde avant.`,
      confirmLabel: 'Tout effacer',
      danger: true,
    })
    if (!ok) return
    for (const c of COLLECTIONS) {
      for (const item of [...db[c]] as { id: string }[]) {
        await adapter.remove(c, item.id)
      }
    }
    await reload()
    localStorage.removeItem('nous.me')
    location.reload()
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Aux petits oignons" title="Réglages" />

      {/* ------------------------------- Nous deux ------------------------------- */}
      <section className="settings-section">
        <h2>
          <Icon name="heart" size={17} /> Nous deux
        </h2>

        {settings.people.map((p) => (
          <div key={p.id} className="row wrap" style={{ gap: 'var(--sp-3)' }}>
            <Avatar person={p} />
            <Input
              value={p.name}
              onChange={(v) => setPerson(p.id, { name: v })}
              placeholder="Prénom"
              style={{ maxWidth: 200 }}
            />
            <ColorInput value={p.color} onChange={(v) => setPerson(p.id, { color: v })} />
            <div style={{ width: 120 }}>
              <SinglePhotoInput
                value={p.photo}
                onChange={(v) => setPerson(p.id, { photo: v })}
                aspect="1 / 1"
              />
            </div>
          </div>
        ))}

        <div className="settings-row">
          <div>
            <div className="settings-row__label">Qui écrit sur cet appareil</div>
            <div className="settings-row__hint">
              Sert à signer les entrées. Chacun choisit son nom sur son propre téléphone.
            </div>
          </div>
          <Segmented
            value={store.me?.id ?? settings.people[0].id}
            onChange={(id) => store.setMe(id)}
            options={settings.people.map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>
      </section>

      {/* ------------------------------ Page d'accueil ------------------------------ */}
      <section className="settings-section">
        <h2>
          <Icon name="home" size={17} /> Page d'accueil
        </h2>

        <div className="form-grid">
          <Field label="Nom de l'espace">
            <Input value={settings.siteName} onChange={(v) => void saveSettings({ siteName: v })} />
          </Field>
          <Field label="Depuis le" hint={`Soit ${formatDate(settings.startDate)}`}>
            <DateInput value={settings.startDate} onChange={(v) => void saveSettings({ startDate: v })} />
          </Field>
          <Field label="Votre phrase" span2>
            <Input
              value={settings.tagline}
              onChange={(v) => void saveSettings({ tagline: v })}
              placeholder="Notre petit espace à deux."
            />
          </Field>
        </div>

        <SinglePhotoInput
          label="Photo de couverture"
          value={settings.coverPhoto}
          onChange={(v) => void saveSettings({ coverPhoto: v })}
          aspect="16 / 9"
        />
      </section>

      {/* -------------------------------- Apparence -------------------------------- */}
      <section className="settings-section">
        <h2>
          <Icon name="sparkle" size={17} /> Apparence
        </h2>
        <div className="settings-row">
          <div>
            <div className="settings-row__label">Thème</div>
            <div className="settings-row__hint">« Automatique » suit le réglage de votre appareil.</div>
          </div>
          <Segmented
            value={settings.theme}
            onChange={(v) => void saveSettings({ theme: v })}
            options={[
              { value: 'light', label: 'Clair', icon: 'sun' },
              { value: 'dark', label: 'Sombre', icon: 'moon' },
              { value: 'auto', label: 'Auto' },
            ]}
          />
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row__label">Couleurs</div>
            <div className="settings-row__hint">
              Le changement se fait en fondu, pas d'un coup sec.
            </div>
          </div>
          <Segmented
            value={settings.palette ?? 'automne'}
            onChange={(v) => void saveSettings({ palette: v })}
            options={[
              { value: 'automne', label: 'Automne' },
              { value: 'bleu', label: 'Bleu' },
            ]}
          />
        </div>
      </section>

      {/* -------------------------------- Surprise -------------------------------- */}
      <section className="settings-section">
        <h2>
          <Icon name="heart" size={17} /> La surprise
        </h2>
        <p className="settings-row__hint" style={{ marginTop: -6 }}>
          {settings.proposal?.answeredAt
            ? `Répondu le ${formatDate(settings.proposal.answeredAt)}${
                settings.proposal.refusals > 0
                  ? ` — après ${settings.proposal.refusals} refus`
                  : ' — du premier coup'
              }${settings.proposal.choseColor ? ', et le site a changé de couleur.' : '.'}`
            : authRequired
              ? "Elle se jouera automatiquement à la première connexion de l'autre personne. Vous pouvez la regarder avant : l'aperçu ne change rien et ne la consomme pas."
              : "Elle se déclenchera à la première connexion de l'autre personne, une fois le partage activé. En attendant, l'aperçu vous la montre en entier sans rien consommer."}
        </p>

          <div className="row wrap" style={{ gap: 8 }}>
            <Button icon="sparkle" onClick={() => setPreviewProposal(true)}>
              Voir l'aperçu
            </Button>
            {settings.proposal?.answeredAt && (
              <Button
                variant="ghost"
                icon="undo"
                onClick={() => void saveSettings({ proposal: undefined })}
              >
                La remettre en jeu
              </Button>
            )}
        </div>
      </section>

      {/* ---------------------------- Critères Airbnb ---------------------------- */}
      <section className="settings-section">
        <h2>
          <Icon name="house" size={17} /> Critères de notation des logements
        </h2>
        <p className="settings-row__hint" style={{ marginTop: -6 }}>
          Le poids détermine l'importance du critère dans la note finale (0,5 = deux fois moins
          important qu'un critère à 1).
        </p>

        {settings.criteria.map((c) => (
          <div key={c.id} className="row" style={{ gap: 'var(--sp-3)' }}>
            <Input
              value={c.label}
              onChange={(v) => setCriterion(c.id, { label: v })}
              style={{ flex: 1 }}
            />
            <div style={{ width: 92 }}>
              <NumberInput
                value={c.weight}
                onChange={(v) => setCriterion(c.id, { weight: v ?? 1 })}
                step={0.5}
                min={0}
                max={3}
              />
            </div>
            <Button
              variant="ghost"
              icon="trash"
              onClick={() => removeCriterion(c.id)}
              aria-label="Retirer"
            />
          </div>
        ))}

        <div className="row wrap" style={{ gap: 8 }}>
          <Button icon="plus" size="sm" onClick={addCriterion}>
            Ajouter un critère
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon="undo"
            onClick={() => void saveSettings({ criteria: DEFAULT_CRITERIA })}
          >
            Rétablir la liste d'origine
          </Button>
        </div>
      </section>

      {/* ------------------------------ Synchronisation ------------------------------ */}
      <section className="settings-section">
        <h2>
          <Icon name={syncKind === 'cloud' ? 'cloud' : 'device'} size={17} /> Écrire à deux
        </h2>

        {syncKind === 'cloud' ? (
          <>
            <div className="row" style={{ gap: 10 }}>
              <span
                className={`sync__dot ${
                  syncState === 'live'
                    ? 'sync__dot--live'
                    : syncState === 'connecting'
                      ? 'sync__dot--connecting'
                      : 'sync__dot--error'
                }`}
              />
              <span style={{ fontSize: 'var(--t-sm)' }}>
                {syncState === 'live'
                  ? 'Synchronisation active — vos modifications apparaissent chez l’autre en direct.'
                  : syncState === 'connecting'
                    ? 'Connexion en cours…'
                    : 'Connexion interrompue. Vos changements repartiront au retour du réseau.'}
              </span>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-row__label">Photos restées sur cet appareil</div>
                <div className="settings-row__hint">
                  Si vous avez commencé hors ligne, certaines photos ne sont visibles que d'ici.
                  Ce bouton les envoie dans l'espace partagé.
                </div>
              </div>
              <Button icon="upload" onClick={() => void migrateMedia()} disabled={migrating}>
                {migrating ? 'Transfert…' : 'Transférer'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="settings-row__hint" style={{ marginTop: -4 }}>
              Pour l'instant, tout est stocké <strong>uniquement dans ce navigateur</strong>. Le site
              fonctionne parfaitement, mais l'autre personne ne voit pas ce que vous écrivez.
            </p>
            <div
              style={{
                padding: 'var(--sp-4)',
                borderRadius: 'var(--r-md)',
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                fontSize: 'var(--t-sm)',
                lineHeight: 1.8,
              }}
            >
              <strong>Pour écrire à deux, depuis n'importe quel appareil :</strong>
              <ol style={{ margin: '8px 0 0', paddingLeft: 20, color: 'var(--ink-2)' }}>
                <li>
                  Créez un projet gratuit sur <span className="code">supabase.com</span>
                </li>
                <li>
                  Ouvrez le SQL Editor et lancez le contenu de{' '}
                  <span className="code">supabase/schema.sql</span>
                </li>
                <li>
                  Copiez <span className="code">.env.example</span> en <span className="code">.env</span>{' '}
                  et collez-y l'URL et la clé « anon »
                </li>
                <li>Relancez le site — l'indicateur passera au vert</li>
              </ol>
              <p style={{ marginTop: 10, color: 'var(--ink-3)', fontSize: 'var(--t-xs)' }}>
                Le fichier <span className="code">README.md</span> détaille chaque étape, y compris la
                mise en ligne pour y accéder depuis vos téléphones.
              </p>
            </div>
          </>
        )}
      </section>

      {/* -------------------------------- Données -------------------------------- */}
      <section className="settings-section">
        <h2>
          <Icon name="layers" size={17} /> Nos données
        </h2>

        <div className="row wrap" style={{ gap: 8 }}>
          {COLLECTIONS.filter((c) => c !== 'settings').map((c) => (
            <Chip key={c} outline>
              {db[c].length} {LABELS[c]}
            </Chip>
          ))}
        </div>

        {usage && (
          <div className="settings-row__hint">
            Espace utilisé sur cet appareil : {formatBytes(usage.usage)}
            {usage.quota > 0 && ` sur ${formatBytes(usage.quota)} disponibles`}
          </div>
        )}

        <div className="row wrap" style={{ gap: 8 }}>
          <Button icon="download" onClick={exportAll}>
            Télécharger une sauvegarde
          </Button>
          <Button icon="upload" onClick={() => void importAll()}>
            Restaurer un fichier
          </Button>
          <Button variant="danger" icon="trash" onClick={() => void wipe()}>
            Tout effacer
          </Button>
        </div>
        <p className="settings-row__hint">
          La sauvegarde contient tous vos textes. Les photos, elles, restent dans le navigateur (mode
          local) ou dans votre espace Supabase (mode partagé).
        </p>
      </section>
      {previewProposal && <Proposal preview onDone={() => setPreviewProposal(false)} />}

      {confirmNode}
    </div>
  )
}

const LABELS: Record<string, string> = {
  adventures: 'aventures',
  words: 'mots',
  stays: 'logements',
  places: 'lieux',
  bucket: 'envies',
  photos: 'photos',
  awards: 'awards',
  capsules: 'capsules',
  moodboard: 'éléments de moodboard',
}
