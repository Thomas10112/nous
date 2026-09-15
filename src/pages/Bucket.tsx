import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useCollection, useStore } from '../data/store'
import type { BucketItem } from '../data/types'
import { Icon } from '../components/ui/Icon'
import { Button, Chip, Empty, PageHeader, Segmented } from '../components/ui/primitives'
import { FormModal, useConfirm } from '../components/ui/Modal'
import { DateInput, Field, Input, Textarea } from '../components/ui/form'
import { PhotoInput, Img, useLightbox } from '../components/ui/Img'
import { formatDateShort, todayISO } from '../lib/date'
import { matches, sortBy, uniq } from '../lib/utils'

const SUGGESTED_CATEGORIES = ['Voyage', 'Aventure', 'À la maison', 'Gourmandise', 'Défi', 'Un jour…']

type Mode = 'todo' | 'done' | 'all'

export default function Bucket() {
  const { items, create, update, remove } = useCollection('bucket')
  const { confirm, node: confirmNode } = useConfirm()
  const lightbox = useLightbox()

  const blank = (): Omit<BucketItem, 'id' | 'createdAt' | 'updatedAt'> => ({
    title: '',
    note: '',
    category: '',
    done: false,
    photos: [],
  })

  const [editing, setEditing] = useState<BucketItem | 'new' | null>(null)
  const [draft, setDraft] = useState(blank)
  const [mode, setMode] = useState<Mode>('todo')
  const [category, setCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const categories = useMemo(
    () => uniq(items.map((b) => b.category).filter(Boolean)).sort(),
    [items],
  )

  const done = items.filter((b) => b.done).length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0

  const filtered = useMemo(() => {
    let out = items
    if (mode === 'todo') out = out.filter((b) => !b.done)
    if (mode === 'done') out = out.filter((b) => b.done)
    if (category) out = out.filter((b) => b.category === category)
    if (query) out = out.filter((b) => matches(b.title, query) || matches(b.note, query))
    return sortBy(out, (b) => `${b.done ? '1' : '0'}-${b.targetDate ?? b.createdAt}`, 'asc')
  }, [items, mode, category, query])

  const openNew = () => {
    setDraft(blank())
    setEditing('new')
  }

  const save = async () => {
    if (!draft.title.trim()) return
    if (editing === 'new') await create(draft)
    else if (editing) await update(editing.id, draft)
    setEditing(null)
  }

  const toggle = (b: BucketItem) =>
    void update(b.id, {
      done: !b.done,
      doneDate: !b.done ? todayISO() : undefined,
    })

  const del = async (b: BucketItem) => {
    const ok = await confirm({
      title: 'Retirer de la liste ?',
      message: `« ${b.title} »`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (ok) {
      await remove(b.id)
      setEditing(null)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Un jour, promis"
        title="Bucket list"
        subtitle="Tout ce qu'on veut faire ensemble, un jour ou l'autre."
        actions={
          <Button variant="primary" icon="plus" onClick={openNew}>
            Ajouter
          </Button>
        }
      />

      {items.length > 0 && (
        <div className="bucket-hero">
          <ProgressRing value={pct} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-lg)' }}>
              {done} sur {items.length}
            </div>
            <p className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 4 }}>
              {pct === 100
                ? 'Tout est fait. Il va falloir rêver plus grand.'
                : done === 0
                  ? 'La liste est prête. Il ne reste qu’à commencer.'
                  : `Encore ${items.length - done} chose${items.length - done > 1 ? 's' : ''} à cocher ensemble.`}
            </p>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={16} />
            <Input value={query} onChange={setQuery} placeholder="Chercher…" />
          </div>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'todo', label: 'À faire' },
              { value: 'done', label: 'Faits', icon: 'check' },
              { value: 'all', label: 'Tout' },
            ]}
          />
          {categories.length > 0 && (
            <div className="toolbar__scroll">
              {categories.map((c) => (
                <Chip key={c} onClick={() => setCategory(category === c ? null : c)} active={category === c}>
                  {c}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty
          icon="list"
          title={items.length ? 'Rien dans cette vue' : 'La liste est vide'}
          text={
            items.length
              ? mode === 'done'
                ? "Rien de coché pour l'instant. Ça viendra."
                : 'Tout est fait ! Ajoutez de nouveaux rêves.'
              : 'Voir une aurore boréale, apprendre à faire des sushis, dormir à la belle étoile…'
          }
          action={
            !items.length && (
              <Button variant="primary" icon="plus" onClick={openNew}>
                Le premier rêve
              </Button>
            )
          }
        />
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          <AnimatePresence mode="popLayout">
            {filtered.map((b, i) => (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: Math.min(i * 0.03, 0.24), duration: 0.32 }}
                className={`bucket-item ${b.done ? 'bucket-item--done' : ''}`}
              >
                <button
                  type="button"
                  className={`bucket-tick ${b.done ? 'bucket-tick--on' : ''}`}
                  onClick={() => toggle(b)}
                  aria-label={b.done ? 'Décocher' : 'Cocher'}
                >
                  <Icon name="check" size={14} strokeWidth={2.8} />
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bucket-item__title">{b.title}</div>
                  {b.note && <p className="bucket-item__note">{b.note}</p>}

                  <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
                    {b.category && <Chip tone="sage">{b.category}</Chip>}
                    {b.targetDate && !b.done && (
                      <Chip outline>
                        <Icon name="calendar" size={11} /> {formatDateShort(b.targetDate)}
                      </Chip>
                    )}
                    {b.done && b.doneDate && (
                      <Chip tone="gold">
                        <Icon name="check" size={11} /> Fait le {formatDateShort(b.doneDate)}
                      </Chip>
                    )}
                  </div>

                  {b.photos.length > 0 && (
                    <div className="row" style={{ gap: 6, marginTop: 10 }}>
                      {b.photos.slice(0, 4).map((m, idx) => (
                        <div
                          key={m}
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 'var(--r-sm)',
                            overflow: 'hidden',
                            cursor: 'zoom-in',
                          }}
                          onClick={() =>
                            lightbox.open(b.photos.map((x) => ({ media: x, caption: b.title })), idx)
                          }
                        >
                          <Img media={m} alt="" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="row" style={{ gap: 4 }}>
                  <button
                    className="card__action"
                    onClick={() => {
                      setDraft({ ...b })
                      setEditing(b)
                    }}
                    aria-label="Modifier"
                  >
                    <Icon name="edit" size={14} />
                  </button>
                  <button
                    className="card__action card__action--danger"
                    onClick={() => void del(b)}
                    aria-label="Supprimer"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <button className="fab" onClick={openNew} aria-label="Ajouter">
        <Icon name="plus" size={24} />
      </button>

      <FormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Un truc à faire ensemble' : 'Modifier'}
        onSubmit={save}
        canSubmit={!!draft.title.trim()}
        onDelete={editing && editing !== 'new' ? () => void del(editing) : undefined}
      >
        <Field label="Quoi ?">
          <Input
            value={draft.title}
            onChange={(v) => setDraft({ ...draft, title: v })}
            placeholder="Voir une aurore boréale"
            autoFocus
            className="input input--lg"
          />
        </Field>

        <Field label="Des précisions">
          <Textarea
            value={draft.note}
            onChange={(v) => setDraft({ ...draft, note: v })}
            placeholder="En Laponie, entre septembre et mars. Prévoir gros manteau."
            rows={3}
          />
        </Field>

        <div className="form-grid">
          <Field label="Catégorie">
            <Input
              value={draft.category}
              onChange={(v) => setDraft({ ...draft, category: v })}
              placeholder="Voyage"
              list="bucket-cats"
            />
            <datalist id="bucket-cats">
              {uniq([...categories, ...SUGGESTED_CATEGORIES]).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Idéalement avant">
            <DateInput
              value={draft.targetDate ?? ''}
              onChange={(v) => setDraft({ ...draft, targetDate: v || undefined })}
            />
          </Field>
        </div>

        <div className="row wrap" style={{ gap: 6 }}>
          {SUGGESTED_CATEGORIES.map((c) => (
            <Chip key={c} onClick={() => setDraft({ ...draft, category: c })} active={draft.category === c}>
              {c}
            </Chip>
          ))}
        </div>

        {draft.done && (
          <Field label="Fait le">
            <DateInput
              value={draft.doneDate ?? todayISO()}
              onChange={(v) => setDraft({ ...draft, doneDate: v })}
            />
          </Field>
        )}

        <PhotoInput
          label="Photos (une fois que c'est fait !)"
          value={draft.photos}
          onChange={(v) => setDraft({ ...draft, photos: v })}
          max={8}
        />
      </FormModal>

      {confirmNode}
      {lightbox.node}
    </div>
  )
}

/* --------------------------- Anneau de progression --------------------------- */

function ProgressRing({ value }: { value: number }) {
  const r = 38
  const circumference = 2 * Math.PI * r
  return (
    <div className="bucket-ring">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
        <motion.circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="var(--sage)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
          transform="rotate(-90 44 44)"
        />
      </svg>
      <span className="bucket-ring__label">{value}%</span>
    </div>
  )
}
