import { motion } from 'framer-motion'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { cx, initials, readableOn } from '../../lib/utils'
import type { Person } from '../../data/types'
import { Img } from './Img'

/* -------------------------------- Bouton -------------------------------- */

type ButtonVariant = 'default' | 'primary' | 'soft' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  icon?: IconName
  iconRight?: IconName
  block?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'default',
  size = 'md',
  icon,
  iconRight,
  block,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconOnly = !children && (icon || iconRight)
  return (
    <button
      type={type}
      className={cx(
        'btn',
        variant !== 'default' && `btn--${variant}`,
        size !== 'md' && `btn--${size}`,
        block && 'btn--block',
        iconOnly && 'btn--icon',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 15 : 17} />}
    </button>
  )
}

/* -------------------------------- Carte -------------------------------- */

export function Card({
  children,
  pad,
  hover,
  flat,
  className,
  ...rest
}: {
  children: ReactNode
  pad?: boolean
  hover?: boolean
  flat?: boolean
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('card', pad && 'card--pad', hover && 'card--hover', flat && 'card--flat', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

/** Boutons modifier / supprimer qui apparaissent au survol d'une carte. */
export function CardActions({
  onEdit,
  onDelete,
  extra,
}: {
  onEdit?: () => void
  onDelete?: () => void
  extra?: ReactNode
}) {
  return (
    <div className="card__actions">
      {extra}
      {onEdit && (
        <button className="card__action" onClick={onEdit} aria-label="Modifier" type="button">
          <Icon name="edit" size={15} />
        </button>
      )}
      {onDelete && (
        <button
          className="card__action card__action--danger"
          onClick={onDelete}
          aria-label="Supprimer"
          type="button"
        >
          <Icon name="trash" size={15} />
        </button>
      )}
    </div>
  )
}

/* --------------------------------- Puce --------------------------------- */

export function Chip({
  children,
  tone,
  outline,
  onClick,
  active,
  className,
}: {
  children: ReactNode
  tone?: 'accent' | 'gold' | 'sage' | 'plum' | 'sky'
  outline?: boolean
  onClick?: () => void
  active?: boolean
  className?: string
}) {
  const cls = cx(
    'chip',
    tone && `chip--${tone}`,
    outline && 'chip--outline',
    onClick && 'chip--button',
    active && 'chip--on',
    className,
  )
  if (!onClick) return <span className={cls}>{children}</span>
  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={active}>
      {children}
    </button>
  )
}

/* ------------------------------ Segmenté ------------------------------ */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: IconName }[]
}) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="segmented__item"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {value === o.value && (
            <motion.span layoutId="segmented-pill" className="segmented__pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
          )}
          {o.icon && <Icon name={o.icon} size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------ État vide ------------------------------ */

export function Empty({
  icon = 'sparkle',
  title,
  text,
  action,
}: {
  icon?: IconName
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <motion.div
      className="empty"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="empty__icon">
        <Icon name={icon} size={28} strokeWidth={1.4} />
      </div>
      <div className="empty__title">{title}</div>
      {text && <p className="empty__text">{text}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </motion.div>
  )
}

/* --------------------------- En-tête de page --------------------------- */

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <div className="page-header__sub">{subtitle}</div>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}

/* ------------------------------ Statistique ------------------------------ */

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  )
}

/* -------------------------------- Avatar -------------------------------- */

export function Avatar({
  person,
  size = 'md',
}: {
  person?: Person | null
  size?: 'sm' | 'md' | 'lg'
}) {
  if (!person) return null
  return (
    <div
      className={cx('avatar', size !== 'md' && `avatar--${size}`)}
      style={{ background: person.color, color: readableOn(person.color) }}
      title={person.name}
    >
      {person.photo ? <Img media={person.photo} alt={person.name} /> : initials(person.name)}
    </div>
  )
}

/* ------------------------------ Progression ------------------------------ */

export function Progress({ value, max = 100 }: { value: number; max?: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

/* ------------------------------ Séparateur ------------------------------ */

export function Divider({ children }: { children?: ReactNode }) {
  return <div className="divider">{children}</div>
}
