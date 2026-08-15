/* ------------------------------------------------------------------
   Affichage d'images stockees via une MediaRef.

   Les refs "local:..." pointent vers IndexedDB et doivent etre resolues
   en URL d'objet : ce composant s'en charge et met le resultat en cache.
   ------------------------------------------------------------------ */

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../data/store'
import type { MediaRef } from '../../data/types'
import { cx } from '../../lib/utils'
import { filesFromEvent, pickFiles } from '../../data/media'
import { Icon } from './Icon'

/* Cache partage : evite de re-resoudre la meme ref a chaque rendu. */
/* Ce cache n'existe que pour eviter un clignotement au remontage d'une
   image. En mode partage, les URLs sont signees et finissent par expirer :
   on leur donne donc une duree de vie courte, bien inferieure a celle du
   lien lui-meme, et on vide tout a la deconnexion. */
const CACHE_TTL_MS = 60 * 60 * 1000

const urlCache = new Map<string, { url: string; at: number }>()

export function clearMediaCache(): void {
  urlCache.clear()
}

function readCache(ref: string): string | null {
  const entry = urlCache.get(ref)
  if (!entry) return null
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    urlCache.delete(ref)
    return null
  }
  return entry.url
}

export function useMediaURL(ref?: MediaRef | null): string | null {
  const { mediaURL } = useStore()
  const [url, setUrl] = useState<string | null>(() => (ref ? readCache(ref) : null))

  useEffect(() => {
    if (!ref) {
      setUrl(null)
      return
    }
    const cached = readCache(ref)
    if (cached) {
      setUrl(cached)
      return
    }
    let alive = true
    void mediaURL(ref).then((u) => {
      if (!alive) return
      if (u) urlCache.set(ref, { url: u, at: Date.now() })
      setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [ref, mediaURL])

  return url
}

export function Img({
  media,
  alt = '',
  className,
  onClick,
}: {
  media?: MediaRef | null
  alt?: string
  className?: string
  onClick?: () => void
}) {
  const url = useMediaURL(media)

  if (!media) {
    return (
      <div className={cx('img-fallback', className)}>
        <Icon name="image" size={22} strokeWidth={1.3} />
      </div>
    )
  }
  if (!url) return <div className={cx('img', 'img--loading', className)} />

  return (
    <img
      src={url}
      alt={alt}
      className={cx('img', className)}
      loading="lazy"
      decoding="async"
      onClick={onClick}
    />
  )
}

/* --------------------------- Sélecteur de photos --------------------------- */

export function PhotoInput({
  value,
  onChange,
  max = 24,
  label,
}: {
  value: MediaRef[]
  onChange: (next: MediaRef[]) => void
  max?: number
  label?: string
}) {
  const { uploadImage, notify } = useStore()
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      const room = max - value.length
      const batch = files.slice(0, Math.max(0, room))
      if (!batch.length) {
        notify(`Maximum ${max} photos`, 'error')
        return
      }
      setBusy(true)
      try {
        const refs: MediaRef[] = []
        for (const file of batch) {
          refs.push(await uploadImage(file))
        }
        onChange([...value, ...refs])
      } catch (err) {
        notify(err instanceof Error ? err.message : "Impossible d'ajouter la photo", 'error')
      } finally {
        setBusy(false)
      }
    },
    [max, value, onChange, uploadImage, notify],
  )

  return (
    <div className="field">
      {label && <span className="field__label">{label}</span>}
      <div
        className="photos"
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void addFiles(filesFromEvent(e.nativeEvent))
        }}
      >
        {value.map((ref, i) => (
          <motion.div
            key={ref}
            className="photos__item"
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Img media={ref} alt={`Photo ${i + 1}`} />
            <button
              type="button"
              className="photos__remove"
              onClick={() => onChange(value.filter((r) => r !== ref))}
              aria-label="Retirer cette photo"
            >
              <Icon name="close" size={13} strokeWidth={2.2} />
            </button>
          </motion.div>
        ))}

        {value.length < max && (
          <button
            type="button"
            className={cx('photos__add', dragging && 'photos__add--drag')}
            onClick={() => void pickFiles().then(addFiles)}
            disabled={busy}
          >
            {busy ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ display: 'grid' }}
              >
                <Icon name="sparkle" size={18} />
              </motion.span>
            ) : (
              <>
                <Icon name="plus" size={18} />
                <span style={{ fontSize: 10 }}>Photo</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

/** Variante pour une seule image (photo de couverture, portrait). */
export function SinglePhotoInput({
  value,
  onChange,
  label,
  aspect = '16 / 9',
}: {
  value?: MediaRef
  onChange: (next?: MediaRef) => void
  label?: string
  aspect?: string
}) {
  const { uploadImage, notify } = useStore()
  const [busy, setBusy] = useState(false)

  const choose = async () => {
    const files = await pickFiles(false)
    if (!files[0]) return
    setBusy(true)
    try {
      onChange(await uploadImage(files[0]))
    } catch (err) {
      notify(err instanceof Error ? err.message : "Impossible d'ajouter la photo", 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="field">
      {label && <span className="field__label">{label}</span>}
      <div
        style={{
          position: 'relative',
          aspectRatio: aspect,
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
          border: '1.5px dashed var(--line-strong)',
          background: 'var(--surface-2)',
        }}
      >
        {value ? (
          <>
            <Img media={value} alt="" />
            <button
              type="button"
              className="photos__remove"
              onClick={() => onChange(undefined)}
              aria-label="Retirer"
            >
              <Icon name="close" size={13} strokeWidth={2.2} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void choose()}
            disabled={busy}
            style={{
              position: 'absolute',
              inset: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              gap: 6,
              color: 'var(--ink-3)',
            }}
          >
            <Icon name={busy ? 'sparkle' : 'upload'} size={22} />
            <span style={{ fontSize: 'var(--t-xs)' }}>
              {busy ? 'Envoi…' : 'Choisir une photo'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ Visionneuse ------------------------------ */

export interface LightboxItem {
  media: MediaRef
  caption?: string
}

export function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: LightboxItem[]
  index: number
  onClose: () => void
  onIndexChange: (i: number) => void
}) {
  const current = items[index]
  const url = useMediaURL(current?.media)
  const touchStart = useRef<number | null>(null)

  const go = useCallback(
    (delta: number) => {
      const next = (index + delta + items.length) % items.length
      onIndexChange(next)
    },
    [index, items.length, onIndexChange],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [go, onClose])

  if (!current) return null

  return createPortal(
    <motion.div
      className="lightbox"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return
        const dx = e.changedTouches[0].clientX - touchStart.current
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
        touchStart.current = null
      }}
    >
      <button className="lightbox__nav lightbox__close" onClick={onClose} aria-label="Fermer" style={{ top: 20, transform: 'none' }}>
        <Icon name="close" size={20} />
      </button>

      {items.length > 1 && (
        <>
          <button
            className="lightbox__nav"
            style={{ left: 16 }}
            onClick={(e) => {
              e.stopPropagation()
              go(-1)
            }}
            aria-label="Précédente"
          >
            <Icon name="chevron-left" size={20} />
          </button>
          <button
            className="lightbox__nav"
            style={{ right: 16 }}
            onClick={(e) => {
              e.stopPropagation()
              go(1)
            }}
            aria-label="Suivante"
          >
            <Icon name="chevron-right" size={20} />
          </button>
        </>
      )}

      <AnimatePresence mode="wait">
        {url && (
          <motion.img
            key={current.media}
            src={url}
            alt={current.caption ?? ''}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </AnimatePresence>

      {(current.caption || items.length > 1) && (
        <div className="lightbox__caption">
          {current.caption}
          {items.length > 1 && (
            <span style={{ opacity: 0.6, marginLeft: current.caption ? 10 : 0 }}>
              {index + 1} / {items.length}
            </span>
          )}
        </div>
      )}
    </motion.div>,
    document.body,
  )
}

/** Gère l'état d'ouverture de la visionneuse. */
export function useLightbox() {
  const [state, setState] = useState<{ items: LightboxItem[]; index: number } | null>(null)
  return {
    open: (items: LightboxItem[], index = 0) => items.length && setState({ items, index }),
    node: (
      <AnimatePresence>
        {state && (
          <Lightbox
            items={state.items}
            index={state.index}
            onClose={() => setState(null)}
            onIndexChange={(i) => setState((s) => (s ? { ...s, index: i } : s))}
          />
        )}
      </AnimatePresence>
    ),
  }
}
