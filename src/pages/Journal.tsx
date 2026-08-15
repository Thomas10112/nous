import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useCollection, useStore } from '../data/store'
import type { Adventure } from '../data/types'
import { Icon } from '../components/ui/Icon'
import { Button, Card, CardActions, Chip, Empty, PageHeader } from '../components/ui/primitives'
import { FormModal, useConfirm } from '../components/ui/Modal'
import { DateInput, Field, Input, Stars, TagInput, Textarea } from '../components/ui/form'
import { Img, PhotoInput, useLightbox } from '../components/ui/Img'
import { formatDate, todayISO } from '../lib/date'
import { matches, sortBy, uniq } from '../lib/utils'
import { Avatar } from '../components/ui/primitives'

const blank = (): Omit<Adventure, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: '',
  date: todayISO(),
  place: '',
  description: '',
  photos: [],
  tags: [],
  rating: 0,
  favorite: false,
})

export default function Journal() {
  const { items, create, update, remove } = useCollection('adventures')
  const { settings } = useStore()
  const { confirm, node: confirmNode } = useConfirm()
  const lightbox = useLightbox()

  const [editing, setEditing] = useState<Adventure | 'new' | null>(null)
  const [draft, setDraft] = useState(blank)
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [favOnly, setFavOnly] = useState(false)

  const allTags = useMemo(() => uniq(items.flatMap((a) => a.tags)).sort(), [items])

  const filtered = useMemo(() => {
    let out = items
    if (query) {
      out = out.filter(
        (a) =>
          matches(a.title, query) ||
          matches(a.place, query) ||
          matches(a.description, query) ||
          a.tags.some((t) => matches(t, query)),
      )
    }
    if (tagFilter) out = out.filter((a) => a.tags.includes(tagFilter))
    if (favOnly) out = out.filter((a) => a.favorite)
    return sortBy(out, (a) => a.date, 'desc')
  }, [items, query, tagFilter, favOnly])

  /** Regroupement par année pour la frise. */
  const byYear = useMemo(() => {
    const groups = new Map<string, Adventure[]>()
    filtered.forEach((a) => {
      const year = (a.date || '').slice(0, 4) || '—'
      if (!groups.has(year)) groups.set(year, [])
      groups.get(year)!.push(a)
    })
    return [...groups.entries()]
  }, [filtered])

  const openNew = () => {
    setDraft(blank())
    setEditing('new')
  }

  const openEdit = (a: Adventure) => {
    setDraft({ ...a })
    setEditing(a)
  }

  const save = async () => {
    if (!draft.title.trim()) return
    if (editing === 'new') await create(draft)
    else if (editing) await update(editing.id, draft)
    setEditing(null)
  }

  const del = async (a: Adventure) => {
    const ok = await confirm({
      title: 'Supprimer cette aventure ?',
      message: `« ${a.title} » et ses ${a.photos.length} photo(s) disparaîtront de la frise.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (ok) {
      await remove(a.id)
      setEditing(null)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Notre journal"
        title="Nos aventures"
        subtitle={
          items.length
            ? `${items.length} histoire${items.length > 1 ? 's' : ''} écrite${items.length > 1 ? 's' : ''} ensemble`
            : 'Chaque sortie, chaque voyage, chaque dimanche pluvieux.'
        }
        actions={
          <Button variant="primary" icon="plus" onClick={openNew}>
            Ajouter
          </Button>
        }
      />

      {items.length > 0 && (
        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={16} />
            <Input value={query} onChange={setQuery} placeholder="Chercher un souvenir…" />
          </div>
          <button
            className={`chip chip--button ${favOnly ? 'chip--on' : ''}`}
            onClick={() => setFavOnly((v) => !v)}
            type="button"
          >
            <Icon name={favOnly ? 'heart-filled' : 'heart'} size={12} />
            Coups de cœur
          </button>
          {allTags.length > 0 && (
            <div className="toolbar__scroll">
              {allTags.map((t) => (
                <Chip key={t} onClick={() => setTagFilter(tagFilter === t ? null : t)} active={tagFilter === t}>
                  {t}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty
          icon="book"
          title={items.length ? 'Rien ne correspond' : 'La première page est blanche'}
          text={
            items.length
              ? 'Essayez un autre mot, ou retirez les filtres.'
              : 'Un week-end, un resto, une bêtise mémorable : tout mérite sa place ici.'
          }
          action={
            !items.length && (
              <Button variant="primary" icon="plus" onClick={openNew}>
                Notre première aventure
              </Button>
            )
          }
        />
      ) : (
        <div className="timeline">
          {byYear.map(([year, list]) => (
            <div key={year}>
              <div className="timeline__year">
                <h2>{year}</h2>
                <span className="dim" style={{ fontSize: 'var(--t-xs)' }}>
                  {list.length} souvenir{list.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="stack" style={{ gap: 'var(--sp-4)' }}>
                <AnimatePresence mode="popLayout">
                  {list.map((a, i) => (
                    <motion.div
                      key={a.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ delay: Math.min(i * 0.04, 0.24), duration: 0.4 }}
                    >
                      <Card hover className={`adv ${a.photos.length ? 'adv--with-photo' : ''}`}>
                        <CardActions onEdit={() => openEdit(a)} onDelete={() => void del(a)} />

                        {a.photos.length > 0 && (
                          <div
                            className="adv__photos"
                            onClick={() =>
                              lightbox.open(
                                a.photos.map((m) => ({ media: m, caption: a.title })),
                                0,
                              )
                            }
                            style={{ cursor: 'zoom-in' }}
                          >
                            <Img media={a.photos[0]} alt={a.title} />
                            {a.photos.length > 1 && (
                              <span className="adv__more">+{a.photos.length - 1}</span>
                            )}
                          </div>
                        )}

                        <div className="adv__body">
                          <div className="adv__meta">
                            <span className="row" style={{ gap: 5 }}>
                              <Icon name="calendar" size={12} />
                              {formatDate(a.date)}
                              {a.endDate && a.endDate !== a.date && ` → ${formatDate(a.endDate)}`}
                            </span>
                            {a.place && (
                              <span className="row" style={{ gap: 5 }}>
                                <Icon name="pin" size={12} />
                                {a.place}
                              </span>
                            )}
                            {a.favorite && (
                              <span style={{ color: 'var(--accent)', display: 'grid' }}>
                                <Icon name="heart-filled" size={12} />
                              </span>
                            )}
                          </div>

                          <h3 className="adv__title">{a.title}</h3>

                          {a.rating > 0 && <Stars value={a.rating} size={15} />}

                          {a.description && <p className="adv__text clamp-3">{a.description}</p>}

                          <div className="row wrap" style={{ gap: 6, marginTop: 'auto' }}>
                            {a.tags.map((t) => (
                              <Chip key={t} tone="accent">
                                {t}
                              </Chip>
                            ))}
                            {a.authorId && (
                              <span style={{ marginLeft: 'auto' }}>
                                <Avatar
                                  person={settings.people.find((p) => p.id === a.authorId)}
                                  size="sm"
                                />
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="fab" onClick={openNew} aria-label="Ajouter une aventure">
        <Icon name="plus" size={24} />
      </button>

      {/* -------------------------------- Formulaire -------------------------------- */}
      <FormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Nouvelle aventure' : 'Modifier'}
        onSubmit={save}
        canSubmit={!!draft.title.trim()}
        onDelete={editing && editing !== 'new' ? () => void del(editing) : undefined}
      >
        <Field label="Le titre">
          <Input
            value={draft.title}
            onChange={(v) => setDraft({ ...draft, title: v })}
            placeholder="Ce week-end à Étretat"
            autoFocus
            className="input input--lg"
          />
        </Field>

        <div className="form-grid">
          <Field label="Date">
            <DateInput value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
          </Field>
          <Field label="Jusqu'au (facultatif)">
            <DateInput
              value={draft.endDate ?? ''}
              onChange={(v) => setDraft({ ...draft, endDate: v || undefined })}
            />
          </Field>
          <Field label="Lieu" span2>
            <Input
              value={draft.place}
              onChange={(v) => setDraft({ ...draft, place: v })}
              placeholder="Étretat, Normandie"
            />
          </Field>
        </div>

        <Field label="Ce qu'on en garde">
          <Textarea
            value={draft.description}
            onChange={(v) => setDraft({ ...draft, description: v })}
            placeholder="La marée qui monte trop vite, le pique-nique raté, ton fou rire…"
            rows={5}
          />
        </Field>

        <Field label="Étiquettes">
          <TagInput
            value={draft.tags}
            onChange={(v) => setDraft({ ...draft, tags: v })}
            suggestions={['week-end', 'voyage', 'resto', 'nature', 'ville', 'concert', 'famille', 'première fois']}
            placeholder="Entrée pour valider"
          />
        </Field>

        <div className="row wrap" style={{ gap: 'var(--sp-5)', justifyContent: 'space-between' }}>
          <div className="field">
            <span className="field__label">Note</span>
            <Stars value={draft.rating} onChange={(v) => setDraft({ ...draft, rating: v })} size={22} />
          </div>
          <button
            type="button"
            className={`chip chip--button ${draft.favorite ? 'chip--on' : ''}`}
            onClick={() => setDraft({ ...draft, favorite: !draft.favorite })}
            style={{ height: 34, alignSelf: 'flex-end' }}
          >
            <Icon name={draft.favorite ? 'heart-filled' : 'heart'} size={13} />
            Coup de cœur
          </button>
        </div>

        <PhotoInput
          label="Photos"
          value={draft.photos}
          onChange={(v) => setDraft({ ...draft, photos: v })}
        />
      </FormModal>

      {confirmNode}
      {lightbox.node}
    </div>
  )
}
