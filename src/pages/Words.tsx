import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useCollection, useStore } from '../data/store'
import type { Word, WordKind } from '../data/types'
import { Icon } from '../components/ui/Icon'
import { Avatar, Button, Chip, Empty, PageHeader, Segmented } from '../components/ui/primitives'
import { FormModal, useConfirm } from '../components/ui/Modal'
import { DateInput, Field, Input, PersonPicker, Select, Textarea } from '../components/ui/form'
import { formatDateShort, todayISO } from '../lib/date'
import { matches, sortBy } from '../lib/utils'

const KINDS: { value: WordKind; label: string; emoji: string }[] = [
  { value: 'phrase', label: 'Phrase mignonne', emoji: '🤍' },
  { value: 'joke', label: 'Private joke', emoji: '😂' },
  { value: 'nickname', label: 'Surnom', emoji: '🐣' },
  { value: 'quote', label: 'Grande déclaration', emoji: '✨' },
]

const kindLabel = (k: WordKind) => KINDS.find((x) => x.value === k)?.label ?? k
const kindEmoji = (k: WordKind) => KINDS.find((x) => x.value === k)?.emoji ?? '🤍'

export default function Words() {
  const { items, create, update, remove } = useCollection('words')
  const { settings, me } = useStore()
  const { confirm, node: confirmNode } = useConfirm()

  const blank = (): Omit<Word, 'id' | 'createdAt' | 'updatedAt'> => ({
    text: '',
    context: '',
    saidBy: me?.id ?? settings.people[0].id,
    date: todayISO(),
    kind: 'phrase',
    favorite: false,
  })

  const [editing, setEditing] = useState<Word | 'new' | null>(null)
  const [draft, setDraft] = useState(blank)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<WordKind | 'all'>('all')
  const [who, setWho] = useState<string | 'all'>('all')

  const filtered = useMemo(() => {
    let out = items
    if (query) out = out.filter((w) => matches(w.text, query) || matches(w.context, query))
    if (kind !== 'all') out = out.filter((w) => w.kind === kind)
    if (who !== 'all') out = out.filter((w) => w.saidBy === who)
    return sortBy(out, (w) => `${w.favorite ? '1' : '0'}-${w.date}`, 'desc')
  }, [items, query, kind, who])

  const openNew = () => {
    setDraft(blank())
    setEditing('new')
  }

  const save = async () => {
    if (!draft.text.trim()) return
    if (editing === 'new') await create(draft)
    else if (editing) await update(editing.id, draft)
    setEditing(null)
  }

  const del = async (w: Word) => {
    const ok = await confirm({
      title: 'Oublier cette phrase ?',
      message: `« ${w.text.slice(0, 70)}${w.text.length > 70 ? '…' : ''} »`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (ok) {
      await remove(w.id)
      setEditing(null)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Notre langue à nous"
        title="Nos mots"
        subtitle={
          items.length
            ? `${items.length} phrase${items.length > 1 ? 's' : ''} qu'on ne veut pas perdre`
            : "Les private jokes s'oublient. Pas celles-là."
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
            <Input value={query} onChange={setQuery} placeholder="Chercher…" />
          </div>

          <div className="toolbar__scroll">
            <Chip onClick={() => setKind('all')} active={kind === 'all'}>
              Tout
            </Chip>
            {KINDS.map((k) => (
              <Chip key={k.value} onClick={() => setKind(k.value)} active={kind === k.value}>
                {k.emoji} {k.label}
              </Chip>
            ))}
          </div>

          <Segmented
            value={who}
            onChange={setWho}
            options={[
              { value: 'all', label: 'Les deux' },
              ...settings.people.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty
          icon="quote"
          title={items.length ? 'Rien ici' : 'Votre dictionnaire est vide'}
          text={
            items.length
              ? 'Changez de filtre pour retrouver vos phrases.'
              : "Cette expression bizarre que vous seuls comprenez ? C'est exactement ce qu'il faut noter."
          }
          action={
            !items.length && (
              <Button variant="primary" icon="plus" onClick={openNew}>
                La première
              </Button>
            )
          }
        />
      ) : (
        <div className="words">
          <AnimatePresence mode="popLayout">
            {filtered.map((w, i) => {
              const person = settings.people.find((p) => p.id === w.saidBy)
              return (
                <motion.article
                  key={w.id}
                  className="word card__actions-host"
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.36 }}
                  style={{
                    borderTopColor: person?.color,
                    borderTopWidth: 3,
                    borderTopStyle: 'solid',
                  }}
                >
                  <div
                    className="card__actions"
                    style={{ position: 'absolute', top: 10, right: 10, opacity: undefined }}
                  >
                    <button
                      className="card__action"
                      onClick={() =>
                        void update(w.id, { favorite: !w.favorite })
                      }
                      aria-label="Coup de cœur"
                      style={w.favorite ? { color: 'var(--accent)' } : undefined}
                    >
                      <Icon name={w.favorite ? 'heart-filled' : 'heart'} size={14} />
                    </button>
                    <button
                      className="card__action"
                      onClick={() => {
                        setDraft({ ...w })
                        setEditing(w)
                      }}
                      aria-label="Modifier"
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      className="card__action card__action--danger"
                      onClick={() => void del(w)}
                      aria-label="Supprimer"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>

                  <p className="word__text">« {w.text} »</p>

                  {w.context && <p className="word__context">{w.context}</p>}

                  <div className="word__foot">
                    <Avatar person={person} size="sm" />
                    <span>{person?.name ?? 'Nous'}</span>
                    <span className="dim">·</span>
                    <span>{formatDateShort(w.date)}</span>
                    <span style={{ marginLeft: 'auto' }} title={kindLabel(w.kind)}>
                      {kindEmoji(w.kind)}
                    </span>
                  </div>
                </motion.article>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <button className="fab" onClick={openNew} aria-label="Ajouter une phrase">
        <Icon name="plus" size={24} />
      </button>

      <FormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Une phrase à garder' : 'Modifier'}
        onSubmit={save}
        canSubmit={!!draft.text.trim()}
        onDelete={editing && editing !== 'new' ? () => void del(editing) : undefined}
      >
        <Field label="La phrase">
          <Textarea
            value={draft.text}
            onChange={(v) => setDraft({ ...draft, text: v })}
            placeholder="« Tu veux qu'on aille voir les canards ? »"
            rows={3}
            autoFocus
          />
        </Field>

        <Field label="Le contexte" hint="Ce qui rend la phrase drôle six mois plus tard.">
          <Input
            value={draft.context}
            onChange={(v) => setDraft({ ...draft, context: v })}
            placeholder="À 2h du matin, après trois heures de route"
          />
        </Field>

        <div className="form-grid">
          <Field label="Qui l'a dit ?">
            <PersonPicker
              value={draft.saidBy}
              onChange={(id) => setDraft({ ...draft, saidBy: id })}
              people={settings.people}
            />
          </Field>
          <Field label="Genre">
            <Select
              value={draft.kind}
              onChange={(v) => setDraft({ ...draft, kind: v })}
              options={KINDS.map((k) => ({ value: k.value, label: `${k.emoji}  ${k.label}` }))}
            />
          </Field>
          <Field label="Quand ?">
            <DateInput value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
          </Field>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              className={`chip chip--button ${draft.favorite ? 'chip--on' : ''}`}
              onClick={() => setDraft({ ...draft, favorite: !draft.favorite })}
              style={{ height: 42, borderRadius: 'var(--r-sm)' }}
            >
              <Icon name={draft.favorite ? 'heart-filled' : 'heart'} size={14} />
              Mettre en avant sur l'accueil
            </button>
          </div>
        </div>
      </FormModal>

      {confirmNode}
    </div>
  )
}
