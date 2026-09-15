import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useCollection } from '../data/store'
import type { Award } from '../data/types'
import { Icon } from '../components/ui/Icon'
import { Button, Chip, Empty, PageHeader } from '../components/ui/primitives'
import { FormModal, useConfirm } from '../components/ui/Modal'
import { Field, Input, Textarea } from '../components/ui/form'
import { Img, SinglePhotoInput, useLightbox } from '../components/ui/Img'
import { sortBy, uniq } from '../lib/utils'

/** Categories proposees en un clic. Rien n'empeche d'en inventer d'autres. */
const PRESETS: { category: string; emoji: string }[] = [
  { category: 'Meilleur voyage', emoji: '🌍' },
  { category: 'Plus grosse galère', emoji: '🙃' },
  { category: 'Moment le plus mignon', emoji: '🤍' },
  { category: 'Meilleur repas', emoji: '🍝' },
  { category: 'Plus gros fou rire', emoji: '😂' },
  { category: 'Pire décision', emoji: '💀' },
  { category: 'Plus belle surprise', emoji: '🎁' },
  { category: 'Meilleur film vu ensemble', emoji: '🎬' },
  { category: 'Journée la plus paresseuse', emoji: '🛋️' },
  { category: 'Plus beau lever de soleil', emoji: '🌅' },
]

const EMOJIS = ['🏆', '🌍', '🤍', '😂', '🙃', '🍝', '🎁', '🎬', '🛋️', '🌅', '✨', '💀', '🎵', '🐣', '🔥', '🌙']

export default function Awards() {
  const { items, create, update, remove } = useCollection('awards')
  const { confirm, node: confirmNode } = useConfirm()
  const lightbox = useLightbox()

  const currentYear = String(new Date().getFullYear())

  const blank = (preset?: { category: string; emoji: string }): Omit<Award, 'id' | 'createdAt' | 'updatedAt'> => ({
    category: preset?.category ?? '',
    emoji: preset?.emoji ?? '🏆',
    winner: '',
    year: currentYear,
    description: '',
  })

  const [editing, setEditing] = useState<Award | 'new' | null>(null)
  const [draft, setDraft] = useState(blank)
  const [year, setYear] = useState<string | null>(null)

  const years = useMemo(() => uniq(items.map((a) => a.year).filter(Boolean)).sort().reverse(), [items])

  const filtered = useMemo(() => {
    const out = year ? items.filter((a) => a.year === year) : items
    return sortBy(out, (a) => `${a.year}-${a.category}`, 'desc')
  }, [items, year])

  /** Catégories pas encore attribuées cette année. */
  const available = useMemo(() => {
    const used = new Set(items.filter((a) => a.year === currentYear).map((a) => a.category))
    return PRESETS.filter((p) => !used.has(p.category))
  }, [items, currentYear])

  const openNew = (preset?: { category: string; emoji: string }) => {
    setDraft(blank(preset))
    setEditing('new')
  }

  const save = async () => {
    if (!draft.category.trim() || !draft.winner.trim()) return
    if (editing === 'new') await create(draft)
    else if (editing) await update(editing.id, draft)
    setEditing(null)
  }

  const del = async (a: Award) => {
    const ok = await confirm({
      title: 'Retirer cet award ?',
      message: `« ${a.category} » — ${a.winner}`,
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
        eyebrow="Cérémonie annuelle"
        title="Nos awards"
        subtitle="Le palmarès officiel, décerné par un jury de deux personnes."
        actions={
          <Button variant="primary" icon="plus" onClick={() => openNew()}>
            Décerner
          </Button>
        }
      />

      {years.length > 1 && (
        <div className="toolbar">
          <div className="toolbar__scroll">
            <Chip onClick={() => setYear(null)} active={year === null}>
              Toutes les années
            </Chip>
            {years.map((y) => (
              <Chip key={y} onClick={() => setYear(year === y ? null : y)} active={year === y}>
                {y}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty
          icon="trophy"
          title="Aucun award décerné"
          text="Choisissez une catégorie ci-dessous, ou inventez la vôtre."
          action={
            <Button variant="primary" icon="plus" onClick={() => openNew()}>
              Le premier trophée
            </Button>
          }
        />
      ) : (
        <div className="grid grid-auto">
          <AnimatePresence mode="popLayout">
            {filtered.map((a, i) => (
              <motion.article
                key={a.id}
                layout
                className="award"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.4 }}
              >
                <div className="card__actions">
                  <button
                    className="card__action"
                    onClick={() => {
                      setDraft({ ...a })
                      setEditing(a)
                    }}
                    aria-label="Modifier"
                  >
                    <Icon name="edit" size={14} />
                  </button>
                  <button
                    className="card__action card__action--danger"
                    onClick={() => void del(a)}
                    aria-label="Supprimer"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>

                <span className="award__year">{a.year}</span>

                <motion.div
                  className="award__medal"
                  whileHover={{ rotate: [0, -9, 9, 0], scale: 1.06 }}
                  transition={{ duration: 0.55 }}
                >
                  {a.emoji}
                </motion.div>

                <div className="award__cat">{a.category}</div>
                <div className="award__winner">{a.winner}</div>
                {a.description && <p className="award__desc">{a.description}</p>}

                {a.photo && (
                  <div
                    className="award__photo"
                    onClick={() => lightbox.open([{ media: a.photo!, caption: a.winner }], 0)}
                    style={{ cursor: 'zoom-in' }}
                  >
                    <Img media={a.photo} alt={a.winner} />
                  </div>
                )}
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      {available.length > 0 && (
        <section className="panel">
          <div className="panel__title">
            <Icon name="sparkle" size={17} />
            Catégories à remplir {year && year !== currentYear ? '' : `(${currentYear})`}
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            {available.map((p) => (
              <Chip key={p.category} onClick={() => openNew(p)}>
                {p.emoji} {p.category}
              </Chip>
            ))}
          </div>
        </section>
      )}

      <button className="fab" onClick={() => openNew()} aria-label="Décerner un award">
        <Icon name="plus" size={24} />
      </button>

      <FormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Nouveau trophée' : 'Modifier'}
        onSubmit={save}
        canSubmit={!!draft.category.trim() && !!draft.winner.trim()}
        onDelete={editing && editing !== 'new' ? () => void del(editing) : undefined}
      >
        <div className="form-grid">
          <Field label="Catégorie" span2>
            <Input
              value={draft.category}
              onChange={(v) => setDraft({ ...draft, category: v })}
              placeholder="Meilleur voyage"
              autoFocus
              list="award-cats"
            />
            <datalist id="award-cats">
              {PRESETS.map((p) => (
                <option key={p.category} value={p.category} />
              ))}
            </datalist>
          </Field>

          <Field label="Le gagnant" span2>
            <Input
              value={draft.winner}
              onChange={(v) => setDraft({ ...draft, winner: v })}
              placeholder="Les trois jours à Porto"
              className="input input--lg"
            />
          </Field>

          <Field label="Année">
            <Input value={draft.year} onChange={(v) => setDraft({ ...draft, year: v })} placeholder={currentYear} />
          </Field>
        </div>

        <div className="field">
          <span className="field__label">Emoji</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setDraft({ ...draft, emoji: e })}
                style={{
                  width: 40,
                  height: 40,
                  fontSize: 20,
                  borderRadius: 'var(--r-sm)',
                  border: draft.emoji === e ? '2px solid var(--accent)' : '1px solid var(--line)',
                  background: draft.emoji === e ? 'var(--accent-soft)' : 'var(--surface)',
                  cursor: 'pointer',
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <Field label="La justification du jury">
          <Textarea
            value={draft.description}
            onChange={(v) => setDraft({ ...draft, description: v })}
            placeholder="Pour la terrasse, les pastéis de nata et la sieste de trois heures."
            rows={3}
          />
        </Field>

        <SinglePhotoInput
          value={draft.photo}
          onChange={(v) => setDraft({ ...draft, photo: v })}
          label="Une photo (facultatif)"
        />
      </FormModal>

      {confirmNode}
      {lightbox.node}
    </div>
  )
}
