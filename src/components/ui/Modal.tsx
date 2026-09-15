import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { Button } from './primitives'
import { cx } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'narrow' | 'default' | 'wide'
}

export function Modal({ open, onClose, title, children, footer, size = 'default' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className={cx('modal', size === 'wide' && 'modal--wide', size === 'narrow' && 'modal--narrow')}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="modal__grip" />
            <div className="modal__header">
              <div className="modal__title">{title}</div>
              <Button variant="ghost" icon="close" onClick={onClose} aria-label="Fermer" />
            </div>
            <div className="modal__body">{children}</div>
            {footer && <div className="modal__footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* --------------------------- Modale de formulaire --------------------------- */

export function FormModal({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = 'Enregistrer',
  onDelete,
  size,
  canSubmit = true,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  onSubmit: () => void | Promise<void>
  submitLabel?: string
  onDelete?: () => void
  size?: 'narrow' | 'default' | 'wide'
  canSubmit?: boolean
}) {
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      await onSubmit()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      footer={
        <>
          {onDelete && (
            <Button variant="danger" icon="trash" onClick={onDelete} aria-label="Supprimer" />
          )}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={!canSubmit || saving}>
            {saving ? 'Enregistrement…' : submitLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="stack"
        style={{ gap: 'var(--sp-4)' }}
      >
        {children}
        {/* Permet la validation par Entrée sans afficher de bouton */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}

/* ----------------------------- Confirmation ----------------------------- */

interface ConfirmState {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback(
    (opts: { title: string; message?: string; confirmLabel?: string; danger?: boolean }) =>
      new Promise<boolean>((resolve) => setState({ ...opts, resolve })),
    [],
  )

  const close = (ok: boolean) => {
    state?.resolve(ok)
    setState(null)
  }

  const node = (
    <Modal
      open={!!state}
      onClose={() => close(false)}
      title={state?.title ?? ''}
      size="narrow"
      footer={
        <>
          <span className="grow" />
          <Button variant="ghost" onClick={() => close(false)}>
            Annuler
          </Button>
          <Button
            variant={state?.danger ? 'danger' : 'primary'}
            onClick={() => close(true)}
          >
            {state?.confirmLabel ?? 'Confirmer'}
          </Button>
        </>
      }
    >
      {state?.message && <p className="muted">{state.message}</p>}
    </Modal>
  )

  return { confirm, node }
}

/* -------------------------------- Toasts -------------------------------- */

export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: { id: string; message: string; tone: 'info' | 'success' | 'error' }[]
  onDismiss: (id: string) => void
}) {
  return createPortal(
    <div className="toasts">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={cx('toast', t.tone !== 'info' && `toast--${t.tone}`)}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={() => onDismiss(t.id)}
          >
            <Icon
              name={t.tone === 'error' ? 'close' : t.tone === 'success' ? 'check' : 'sparkle'}
              size={15}
            />
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
