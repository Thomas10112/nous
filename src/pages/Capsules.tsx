/* ------------------------------------------------------------------
   Capsules temporelles.

   Le message reste masque jusqu'a la date choisie. C'est un verrou de
   confiance, pas un coffre-fort : quelqu'un de determine pourrait lire
   la donnee brute. Pour un site prive a deux, c'est le bon compromis
   (et ca evite de perdre le message si on oublie une cle).
   ------------------------------------------------------------------ */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useCollection, useStore } from '../data/store'
import type { Capsule } from '../data/types'
import { Icon } from '../components/ui/Icon'
import { Avatar, Button, Chip, Empty, PageHeader, Segmented } from '../components/ui/primitives'
import { FormModal, useConfirm } from '../components/ui/Modal'
import { Field, Input, PersonPicker, Textarea } from '../components/ui/form'
import { Img, PhotoInput, useLightbox } from '../components/ui/Img'
import { countdown, formatDate, formatDateTime } from '../lib/date'
import { sortBy } from '../lib/utils'

/** Date par defaut : dans un an. */
const inOneYear = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 16)
}

type View = 'locked' | 'open' | 'all'

export default function Capsules() {
  const { items, create, update, remove } = useCollection('capsules')
  const { settings, me } = useStore()
  const { confirm, node: confirmNode } = useConfirm()
  const lightbox = useLightbox()

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const other = settings.people.find((p) => p.id !== me?.id) ?? settings.people[1]

  const blank = (): Omit<Capsule, 'id' | 'createdAt' | 'updatedAt'> => ({
    title: '',
    message: '',
    unlockAt: inOneYear(),
    fromId: me?.id ?? settings.people[0].id,
    toId: other?.id ?? settings.people[1].id,
    photos: [],
  })

  const [editing, setEditing] = useState<Capsule | 'new' | null>(null)
  const [draft, setDraft] = useState(blank)
  const [view, setView] = useState<View>('all')
  const [reading, setReading] = useState<Capsule | null>(null)

  const isUnlocked = (c: Capsule) => new Date(c.unlockAt).getTime() <= now.getTime()

  const filtered = useMemo(() => {
    let out = items
    if (view === 'locked') out = out.filter((c) => !isUnlocked(c))
    if (view === 'open') out = out.filter((c) => isUnlocked(c))
    // Les capsules prêtes à ouvrir passent devant.
    return sortBy(out, (c) => {
      const unlocked = new Date(c.unlockAt).getTime() <= now.getTime()
      const ready = unlocked && !c.openedAt
      return `${ready ? '0' : unlocked ? '2' : '1'}-${c.unlockAt}`
    })
  }, [items, view, now])

  const readyCount = items.filter((c) => isUnlocked(c) && !c.openedAt).length

  const openNew = () => {
    setDraft(blank())
    setEditing('new')
  }

  const save = async () => {
    if (!draft.title.trim() || !draft.message.trim()) return
    if (editing === 'new') await create(draft)
    else if (editing) await update(editing.id, draft)
    setEditing(null)
  }

  const del = async (c: Capsule) => {
    const ok = await confirm({
      title: 'Détruire cette capsule ?',
      message: `« ${c.title} » — le message sera perdu.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (ok) {
      await remove(c.id)
      setEditing(null)
      setReading(null)
    }
  }

  const openCapsule = async (c: Capsule) => {
    if (!c.openedAt) await update(c.id, { openedAt: new Date().toISOString() })
    setReading(c)
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="À ouvrir plus tard"
        title="Capsules temporelles"
        subtitle="Un message écrit aujourd'hui, lu dans un an. Ou dans dix."
        actions={
          <Button variant="primary" icon="plus" onClick={openNew}>
            Écrire
          </Button>
        }
      />

      {readyCount > 0 && (
        <motion.div
          className="upnext"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: 'linear-gradient(120deg, var(--gold-soft), var(--accent-soft))' }}
        >
          <div style={{ color: 'var(--gold)', display: 'grid' }}>
            <Icon name="unlock" size={26} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>
              {readyCount} capsule{readyCount > 1 ? 's' : ''} vous attend{readyCount > 1 ? 'ent' : ''}
            </div>
            <div style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-2)' }}>
              Le moment est venu de la{readyCount > 1 ? 's' : ''} lire.
            </div>
          </div>
        </motion.div>
      )}

      {items.length > 0 && (
        <div className="toolbar">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'all', label: 'Toutes' },
              { value: 'locked', label: 'Scellées', icon: 'lock' },
              { value: 'open', label: 'Ouvertes', icon: 'unlock' },
            ]}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty
          icon="capsule"
          title={items.length ? 'Aucune capsule ici' : 'Aucune capsule'}
          text={
            items.length
              ? 'Changez de filtre.'
              : "Écrivez-lui un mot qu'elle ou il lira dans un an. C'est une drôle de sensation."
          }
          action={
            !items.length && (
              <Button variant="primary" icon="plus" onClick={openNew}>
                Écrire la première
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-auto">
          <AnimatePresence mode="popLayout">
            {filtered.map((c, i) => {
              const unlocked = isUnlocked(c)
              const ready = unlocked && !c.openedAt
              const left = countdown(c.unlockAt, now)
              const from = settings.people.find((p) => p.id === c.fromId)
              const to = settings.people.find((p) => p.id === c.toId)

              return (
                <motion.article
                  key={c.id}
                  layout
                  className={`capsule ${unlocked ? '' : 'capsule--locked'} ${ready ? 'capsule--ready' : ''}`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.4 }}
                >
                  <div className="card__actions">
                    <button
                      className="card__action"
                      onClick={() => {
                        setDraft({ ...c })
                        setEditing(c)
                      }}
                      aria-label="Modifier"
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      className="card__action card__action--danger"
                      onClick={() => void del(c)}
                      aria-label="Supprimer"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>

                  <div className="row" style={{ gap: 'var(--sp-3)' }}>
                    <motion.div
                      className="capsule__lock"
                      animate={ready ? { scale: [1, 1.09, 1] } : {}}
                      transition={{ repeat: ready ? Infinity : 0, duration: 2.2 }}
                    >
                      <Icon name={unlocked ? 'unlock' : 'lock'} size={20} />
                    </motion.div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 className="capsule__title">{c.title}</h3>
                      <div className="row" style={{ gap: 6, fontSize: 'var(--t-xs)', color: 'var(--ink-3)', marginTop: 3 }}>
                        <Avatar person={from} size="sm" />
                        <span>→</span>
                        <Avatar person={to} size="sm" />
                        <span className="truncate">{to?.name}</span>
                      </div>
                    </div>
                  </div>

                  {unlocked ? (
                    <>
                      {c.openedAt ? (
                        <p className="capsule__message clamp-3">{c.message}</p>
                      ) : (
                        <p className="capsule__message capsule__blur">{c.message}</p>
                      )}
                      <div className="row wrap" style={{ gap: 8, marginTop: 'auto' }}>
                        <Button
                          variant={ready ? 'primary' : 'soft'}
                          size="sm"
                          icon={ready ? 'sparkle' : 'book'}
                          onClick={() => void openCapsule(c)}
                        >
                          {ready ? 'Ouvrir la capsule' : 'Relire'}
                        </Button>
                        {c.photos.length > 0 && (
                          <Chip outline>
                            <Icon name="image" size={11} /> {c.photos.length}
                          </Chip>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-3)' }}>
                        Scellée jusqu'au {formatDate(c.unlockAt)}
                      </p>
                      {left && (
                        <div className="capsule__countdown">
                          <CountUnit num={left.days} label={left.days > 1 ? 'jours' : 'jour'} />
                          <CountUnit num={left.hours} label="h" />
                          <CountUnit num={left.minutes} label="min" />
                          <CountUnit num={left.seconds} label="s" />
                        </div>
                      )}
                    </>
                  )}
                </motion.article>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <button className="fab" onClick={openNew} aria-label="Écrire une capsule">
        <Icon name="plus" size={24} />
      </button>

      {/* -------------------------------- Lecture -------------------------------- */}
      <FormModal
        open={!!reading}
        onClose={() => setReading(null)}
        title={reading?.title ?? ''}
        onSubmit={() => setReading(null)}
        submitLabel="Refermer"
      >
        {reading && (
          <>
            <div className="row" style={{ gap: 8, fontSize: 'var(--t-xs)', color: 'var(--ink-3)' }}>
              <Avatar person={settings.people.find((p) => p.id === reading.fromId)} size="sm" />
              <span>
                Écrit le {formatDate(reading.createdAt)} · ouvert le{' '}
                {formatDateTime(reading.openedAt ?? new Date().toISOString())}
              </span>
            </div>

            <motion.p
              className="capsule__message"
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.9 }}
              style={{ fontSize: 'var(--t-md)' }}
            >
              {reading.message}
            </motion.p>

            {reading.photos.length > 0 && (
              <div className="photos">
                {reading.photos.map((m, i) => (
                  <div
                    key={m}
                    className="photos__item"
                    onClick={() =>
                      lightbox.open(reading.photos.map((x) => ({ media: x, caption: reading.title })), i)
                    }
                    style={{ cursor: 'zoom-in' }}
                  >
                    <Img media={m} alt="" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </FormModal>

      {/* ------------------------------- Formulaire ------------------------------- */}
      <FormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Une capsule pour plus tard' : 'Modifier la capsule'}
        onSubmit={save}
        canSubmit={!!draft.title.trim() && !!draft.message.trim()}
        onDelete={editing && editing !== 'new' ? () => void del(editing) : undefined}
      >
        <Field label="Le titre" hint="Visible avant l'ouverture — restez mystérieux.">
          <Input
            value={draft.title}
            onChange={(v) => setDraft({ ...draft, title: v })}
            placeholder="À lire quand tu doutes"
            autoFocus
            className="input input--lg"
          />
        </Field>

        <Field label="Le message" hint="Il restera masqué jusqu'à la date choisie.">
          <Textarea
            value={draft.message}
            onChange={(v) => setDraft({ ...draft, message: v })}
            placeholder="Si tu lis ça, c'est qu'un an est passé…"
            rows={8}
          />
        </Field>

        <div className="form-grid">
          <Field label="De la part de">
            <PersonPicker
              value={draft.fromId}
              onChange={(id) => setDraft({ ...draft, fromId: id })}
              people={settings.people}
            />
          </Field>
          <Field label="Pour">
            <PersonPicker
              value={draft.toId}
              onChange={(id) => setDraft({ ...draft, toId: id })}
              people={settings.people}
            />
          </Field>
        </div>

        <Field label="S'ouvre le">
          <input
            type="datetime-local"
            className="input"
            value={draft.unlockAt.slice(0, 16)}
            onChange={(e) => setDraft({ ...draft, unlockAt: e.target.value })}
          />
        </Field>

        <div className="row wrap" style={{ gap: 6 }}>
          {[
            { label: 'Dans 1 mois', months: 1 },
            { label: 'Dans 6 mois', months: 6 },
            { label: 'Dans 1 an', months: 12 },
            { label: 'Dans 5 ans', months: 60 },
          ].map((p) => (
            <Chip
              key={p.label}
              onClick={() => {
                const d = new Date()
                d.setMonth(d.getMonth() + p.months)
                setDraft({ ...draft, unlockAt: d.toISOString().slice(0, 16) })
              }}
            >
              {p.label}
            </Chip>
          ))}
        </div>

        <PhotoInput
          label="Photos à joindre"
          value={draft.photos}
          onChange={(v) => setDraft({ ...draft, photos: v })}
          max={6}
        />
      </FormModal>

      {confirmNode}
      {lightbox.node}
    </div>
  )
}

function CountUnit({ num, label }: { num: number; label: string }) {
  return (
    <div className="capsule__unit">
      <div className="capsule__unit-num">{num}</div>
      <div className="capsule__unit-label">{label}</div>
    </div>
  )
}
