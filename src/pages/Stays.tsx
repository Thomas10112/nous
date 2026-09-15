import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useCollection, useStore } from '../data/store'
import type { Criterion, Stay } from '../data/types'
import { Icon } from '../components/ui/Icon'
import { Button, Card, CardActions, Chip, Empty, PageHeader, Segmented } from '../components/ui/primitives'
import { FormModal, useConfirm } from '../components/ui/Modal'
import { Checkbox, DateInput, Field, Input, NumberInput, ScoreSlider, Textarea } from '../components/ui/form'
import { Img, PhotoInput, useLightbox } from '../components/ui/Img'
import { formatDate, todayISO } from '../lib/date'
import { matches, round, sortBy } from '../lib/utils'

/** Moyenne ponderee des criteres notes. Les criteres non notes sont ignores. */
export function stayScore(stay: Stay, criteria: Criterion[]): number | null {
  let sum = 0
  let weight = 0
  for (const c of criteria) {
    const v = stay.scores?.[c.id]
    if (typeof v === 'number' && !Number.isNaN(v)) {
      sum += v * c.weight
      weight += c.weight
    }
  }
  return weight > 0 ? round(sum / weight, 1) : null
}

const scoreColor = (v: number) =>
  v >= 8.5 ? 'var(--sage)' : v >= 7 ? 'var(--gold)' : v >= 5 ? 'var(--accent)' : 'var(--ink-3)'

type SortMode = 'rank' | 'date' | 'price'

export default function Stays() {
  const { items, create, update, remove } = useCollection('stays')
  const { settings } = useStore()
  const { confirm, node: confirmNode } = useConfirm()
  const lightbox = useLightbox()
  const criteria = settings.criteria

  const blank = (): Omit<Stay, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: '',
    place: '',
    date: todayISO(),
    photos: [],
    scores: Object.fromEntries(criteria.map((c) => [c.id, 7])),
    comment: '',
    wouldReturn: true,
  })

  const [editing, setEditing] = useState<Stay | 'new' | null>(null)
  const [draft, setDraft] = useState(blank)
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('rank')
  const [expanded, setExpanded] = useState<string | null>(null)

  const ranked = useMemo(() => {
    const withScore = items.map((s) => ({ stay: s, score: stayScore(s, criteria) }))
    // Le classement est toujours calcule sur la note, meme si l'affichage
    // est trie autrement : le numero de podium reste stable.
    const byScore = sortBy(withScore, (x) => x.score ?? -1, 'desc')
    const rankOf = new Map(byScore.map((x, i) => [x.stay.id, i + 1]))

    let list = withScore
    if (query) {
      list = list.filter(
        (x) => matches(x.stay.name, query) || matches(x.stay.place, query) || matches(x.stay.comment, query),
      )
    }

    if (sortMode === 'rank') list = sortBy(list, (x) => x.score ?? -1, 'desc')
    if (sortMode === 'date') list = sortBy(list, (x) => x.stay.date ?? '', 'desc')
    if (sortMode === 'price') list = sortBy(list, (x) => x.stay.price ?? Infinity, 'asc')

    return list.map((x) => ({ ...x, rank: rankOf.get(x.stay.id)! }))
  }, [items, criteria, query, sortMode])

  const best = ranked.find((r) => r.rank === 1)

  const openNew = () => {
    setDraft(blank())
    setEditing('new')
  }

  const save = async () => {
    if (!draft.name.trim()) return
    if (editing === 'new') await create(draft)
    else if (editing) await update(editing.id, draft)
    setEditing(null)
  }

  const del = async (s: Stay) => {
    const ok = await confirm({
      title: 'Retirer ce logement ?',
      message: `« ${s.name} » sortira du classement.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (ok) {
      await remove(s.id)
      setEditing(null)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Le classement officiel"
        title="Nos Airbnb"
        subtitle={
          best
            ? `Champion en titre : ${best.stay.name} — ${best.score}/10`
            : 'Notez chaque logement, le classement se fait tout seul.'
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
            <Input value={query} onChange={setQuery} placeholder="Chercher un logement…" />
          </div>
          <Segmented
            value={sortMode}
            onChange={setSortMode}
            options={[
              { value: 'rank', label: 'Classement', icon: 'trophy' },
              { value: 'date', label: 'Récents', icon: 'calendar' },
              { value: 'price', label: 'Prix', icon: 'target' },
            ]}
          />
        </div>
      )}

      {ranked.length === 0 ? (
        <Empty
          icon="house"
          title={items.length ? 'Aucun résultat' : 'Aucun logement noté'}
          text={
            items.length
              ? 'Essayez un autre mot.'
              : 'Le studio avec la douche bizarre mérite sa note, lui aussi.'
          }
          action={
            !items.length && (
              <Button variant="primary" icon="plus" onClick={openNew}>
                Noter le premier
              </Button>
            )
          }
        />
      ) : (
        <div className="stack" style={{ gap: 'var(--sp-4)' }}>
          <AnimatePresence mode="popLayout">
            {ranked.map(({ stay: s, score, rank }, i) => {
              const open = expanded === s.id
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: Math.min(i * 0.04, 0.24), duration: 0.36 }}
                >
                  <Card hover className="stay">
                    <CardActions
                      onEdit={() => {
                        setDraft({ ...s, scores: { ...s.scores } })
                        setEditing(s)
                      }}
                      onDelete={() => void del(s)}
                    />

                    <div
                      className="stay__photo"
                      onClick={() =>
                        s.photos.length &&
                        lightbox.open(s.photos.map((m) => ({ media: m, caption: s.name })), 0)
                      }
                      style={{ cursor: s.photos.length ? 'zoom-in' : 'default' }}
                    >
                      <Img media={s.photos[0]} alt={s.name} />
                      <span className={`stay__rank ${rank <= 3 ? `stay__rank--${rank}` : ''}`}>
                        {rank}
                      </span>
                      {s.photos.length > 1 && <span className="adv__more">+{s.photos.length - 1}</span>}
                    </div>

                    <div className="stay__body">
                      <div>
                        <h3 className="adv__title">{s.name}</h3>
                        <div className="adv__meta" style={{ marginTop: 5 }}>
                          {s.place && (
                            <span className="row" style={{ gap: 5 }}>
                              <Icon name="pin" size={12} />
                              {s.place}
                            </span>
                          )}
                          {s.date && (
                            <span className="row" style={{ gap: 5 }}>
                              <Icon name="calendar" size={12} />
                              {formatDate(s.date)}
                            </span>
                          )}
                          {s.price !== undefined && (
                            <span>
                              {s.price} €{s.nights ? ` · ${s.nights} nuit${s.nights > 1 ? 's' : ''}` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {s.comment && <p className="adv__text clamp-2">{s.comment}</p>}

                      <div className="row wrap" style={{ gap: 6 }}>
                        {s.wouldReturn && (
                          <Chip tone="sage">
                            <Icon name="heart" size={11} /> On y retourne
                          </Chip>
                        )}
                        {s.url && (
                          <a href={s.url} target="_blank" rel="noopener noreferrer">
                            <Chip outline>
                              <Icon name="link" size={11} /> L'annonce
                            </Chip>
                          </a>
                        )}
                        <button
                          type="button"
                          className="chip chip--button chip--outline"
                          onClick={() => setExpanded(open ? null : s.id)}
                        >
                          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={11} />
                          {open ? 'Masquer' : 'Le détail des notes'}
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="bars" style={{ paddingTop: 10 }}>
                              {criteria.map((c) => {
                                const v = s.scores?.[c.id]
                                if (typeof v !== 'number') return null
                                return (
                                  <div key={c.id} className="bar">
                                    <span className="truncate">{c.label}</span>
                                    <span className="bar__track">
                                      <span
                                        className="bar__fill"
                                        style={{ width: `${v * 10}%`, background: scoreColor(v) }}
                                      />
                                    </span>
                                    <span className="bar__val">{v}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="stay__score">
                      <span
                        className="stay__score-num"
                        style={{ color: score !== null ? scoreColor(score) : 'var(--ink-3)' }}
                      >
                        {score ?? '—'}
                      </span>
                      <span className="stay__score-max">sur 10</span>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <button className="fab" onClick={openNew} aria-label="Ajouter un logement">
        <Icon name="plus" size={24} />
      </button>

      <FormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Nouveau logement' : 'Modifier'}
        onSubmit={save}
        canSubmit={!!draft.name.trim()}
        onDelete={editing && editing !== 'new' ? () => void del(editing) : undefined}
        size="wide"
      >
        <div className="form-grid">
          <Field label="Le nom" span2>
            <Input
              value={draft.name}
              onChange={(v) => setDraft({ ...draft, name: v })}
              placeholder="La cabane dans les arbres"
              autoFocus
              className="input input--lg"
            />
          </Field>
          <Field label="Où ?">
            <Input
              value={draft.place}
              onChange={(v) => setDraft({ ...draft, place: v })}
              placeholder="Ardèche"
            />
          </Field>
          <Field label="Quand ?">
            <DateInput value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
          </Field>
          <Field label="Prix total (€)">
            <NumberInput
              value={draft.price}
              onChange={(v) => setDraft({ ...draft, price: v })}
              placeholder="320"
              min={0}
            />
          </Field>
          <Field label="Nombre de nuits">
            <NumberInput
              value={draft.nights}
              onChange={(v) => setDraft({ ...draft, nights: v })}
              placeholder="2"
              min={0}
            />
          </Field>
          <Field label="Lien de l'annonce" span2>
            <Input
              value={draft.url ?? ''}
              onChange={(v) => setDraft({ ...draft, url: v })}
              placeholder="https://…"
              type="url"
            />
          </Field>
        </div>

        <div className="field">
          <span className="field__label">Les notes</span>
          <div className="stack" style={{ gap: 4, marginTop: 4 }}>
            {criteria.map((c) => (
              <ScoreSlider
                key={c.id}
                label={c.label}
                value={draft.scores?.[c.id] ?? 0}
                onChange={(v) => setDraft({ ...draft, scores: { ...draft.scores, [c.id]: v } })}
              />
            ))}
          </div>
          <span className="field__hint">
            Note finale calculée : <strong>{stayScore(draft as Stay, criteria) ?? '—'}/10</strong>
            {' · '}
            <a href="#/reglages" style={{ color: 'var(--accent)' }}>
              modifier les critères
            </a>
          </span>
        </div>

        <Field label="Le mot de la fin">
          <Textarea
            value={draft.comment}
            onChange={(v) => setDraft({ ...draft, comment: v })}
            placeholder="Vue dingue, mais la douche était un supplice."
            rows={3}
          />
        </Field>

        <Checkbox
          checked={draft.wouldReturn}
          onChange={(v) => setDraft({ ...draft, wouldReturn: v })}
          label="On y retournerait sans hésiter"
        />

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
