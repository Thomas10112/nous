import { useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { cx, uniq } from '../../lib/utils'

/* -------------------------------- Champ -------------------------------- */

export function Field({
  label,
  hint,
  children,
  span2,
}: {
  label?: string
  hint?: string
  children: ReactNode
  span2?: boolean
}) {
  return (
    <label className={cx('field', span2 && 'span-2')}>
      {label && <span className="field__label">{label}</span>}
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

export function Input({
  value,
  onChange,
  ...rest
}: {
  value: string
  onChange: (v: string) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      className={cx('input', rest.className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  )
}

export function NumberInput({
  value,
  onChange,
  ...rest
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      type="number"
      className="input"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      {...rest}
    />
  )
}

export function Textarea({
  value,
  onChange,
  rows = 4,
  ...rest
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'rows'>) {
  return (
    <textarea
      className="textarea"
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function DateInput({
  value,
  onChange,
  type = 'date',
}: {
  value: string
  onChange: (v: string) => void
  type?: 'date' | 'datetime-local'
}) {
  return (
    <input
      type={type}
      className="input"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="check__box">
        <Icon name="check" size={13} strokeWidth={2.6} />
      </span>
      <span>{label}</span>
    </label>
  )
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: 44,
        height: 42,
        padding: 3,
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--r-sm)',
        background: 'var(--surface)',
        cursor: 'pointer',
      }}
    />
  )
}

/* ------------------------------ Notation ------------------------------ */

/** Étoiles sur 5 (utilisées pour les aventures, converties depuis /10). */
export function Stars({
  value,
  onChange,
  size = 18,
  max = 5,
}: {
  value: number
  onChange?: (v: number) => void
  size?: number
  max?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value

  return (
    <div className={cx('rating', !onChange && 'rating--readonly')} onMouseLeave={() => setHover(null)}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className={cx('rating__star', shown >= n && 'rating__star--on')}
          onMouseEnter={() => onChange && setHover(n)}
          onClick={() => onChange?.(value === n ? 0 : n)}
          aria-label={`${n} sur ${max}`}
          tabIndex={onChange ? 0 : -1}
        >
          <Icon name={shown >= n ? 'star-filled' : 'star'} size={size} strokeWidth={1.4} />
        </button>
      ))}
    </div>
  )
}

/** Curseur de note sur 10. */
export function ScoreSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="score__row">
      <span className="score__label">{label}</span>
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="score__value">{value.toFixed(1).replace('.0', '')}</span>
    </div>
  )
}

/* ------------------------------ Étiquettes ------------------------------ */

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Ajouter…',
}: {
  value: string[]
  onChange: (v: string[]) => void
  suggestions?: string[]
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')

  const add = (tag: string) => {
    const t = tag.trim()
    if (!t) return
    onChange(uniq([...value, t]))
    setDraft('')
  }

  const free = suggestions.filter((s) => !value.includes(s)).slice(0, 8)

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row wrap" style={{ gap: 6 }}>
        {value.map((tag) => (
          <span key={tag} className="chip chip--accent">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'grid', color: 'inherit' }}
              aria-label={`Retirer ${tag}`}
            >
              <Icon name="close" size={11} strokeWidth={2.4} />
            </button>
          </span>
        ))}
      </div>

      <input
        className="input"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(draft)
          }
          if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => add(draft)}
      />

      {free.length > 0 && (
        <div className="row wrap" style={{ gap: 6 }}>
          {free.map((s) => (
            <button key={s} type="button" className="chip chip--button chip--outline" onClick={() => add(s)}>
              <Icon name="plus" size={11} strokeWidth={2.2} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------------- Choix d'une des deux personnes ---------------------- */

export function PersonPicker({
  value,
  onChange,
  people,
}: {
  value: string
  onChange: (id: string) => void
  people: { id: string; name: string; color: string }[]
}) {
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      {people.map((p) => {
        const on = value === p.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className="chip chip--button"
            style={{
              height: 34,
              padding: '0 14px',
              background: on ? p.color : 'var(--surface-3)',
              color: on ? '#fff' : 'var(--ink-2)',
              fontWeight: on ? 600 : 500,
            }}
          >
            {p.name}
          </button>
        )
      })}
    </div>
  )
}
