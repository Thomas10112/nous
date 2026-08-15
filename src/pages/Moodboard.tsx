/* ------------------------------------------------------------------
   Moodboard collaboratif.

   Un plan infini : on se deplace, on zoome, on dessine, on colle des
   photos, du texte, des post-it et des autocollants. Chaque element est
   une entree de la collection "moodboard" : quand le mode partage est
   actif, ce que l'un pose apparait chez l'autre.

   Les evenements Pointer couvrent souris, doigt et stylet d'un seul
   coup (pression incluse).
   ------------------------------------------------------------------ */

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCollection, useStore } from '../data/store'
import type { MoodElement, MoodKind } from '../data/types'
import { Icon, type IconName } from '../components/ui/Icon'
import { Button, PageHeader } from '../components/ui/primitives'
import { Modal, useConfirm } from '../components/ui/Modal'
import { Img } from '../components/ui/Img'
import { pickFiles } from '../data/media'
import { clamp, nowISO, uid } from '../lib/utils'
import './moodboard.css'

/* --------------------------------- Constantes --------------------------------- */

type Tool = 'select' | 'pen' | 'eraser' | 'text' | 'note' | 'sticker' | 'image' | 'shape'

const TOOLS: { tool: Tool; icon: IconName; label: string }[] = [
  { tool: 'select', icon: 'cursor', label: 'Déplacer' },
  { tool: 'pen', icon: 'pen', label: 'Dessiner' },
  { tool: 'eraser', icon: 'eraser', label: 'Gommer' },
  { tool: 'text', icon: 'text', label: 'Texte' },
  { tool: 'note', icon: 'note', label: 'Post-it' },
  { tool: 'sticker', icon: 'sticker', label: 'Autocollant' },
  { tool: 'image', icon: 'image', label: 'Photo' },
  { tool: 'shape', icon: 'shape', label: 'Forme' },
]

const COLORS = [
  '#2e2226', '#c4736e', '#e0968e', '#c19a45', '#7c9a81',
  '#6f8bab', '#7d5f77', '#b8785f', '#e7c9a9', '#ffffff',
]

const NOTE_COLORS = ['#fdf0b8', '#fcd9d3', '#d9ecd6', '#d6e4f2', '#eddcf0', '#f7e2c8']

const STICKERS = [
  '🤍', '❤️', '🔥', '✨', '🌙', '☀️', '🌸', '🍄', '🌿', '🦋',
  '🐣', '🐧', '🐨', '🦦', '🍕', '🍷', '☕', '🍜', '🎬', '🎵',
  '📸', '✈️', '🏔️', '🌊', '⛺', '🎁', '💌', '😂', '🥹', '👀',
]

const MIN_SCALE = 0.15
const MAX_SCALE = 4

interface View {
  x: number
  y: number
  scale: number
}

type UndoOp =
  | { type: 'create'; id: string }
  | { type: 'delete'; item: MoodElement }
  | { type: 'update'; id: string; before: Partial<MoodElement> }

/** Garde le pointeur sur l'element meme si le doigt sort du cadre.
    Certains navigateurs lancent une exception si le pointeur n'est plus
    actif : ce n'est jamais bloquant, on continue. */
const capture = (e: React.PointerEvent) => {
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  } catch {
    /* sans importance */
  }
}

/* ------------------------------- Composant ------------------------------- */

export default function Moodboard() {
  const { items, create, update, remove, patchLocal } = useCollection('moodboard')
  const { uploadImage, notify, me, settings } = useStore()
  const { confirm, node: confirmNode } = useConfirm()

  const boardRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 })
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState(COLORS[1])
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [selected, setSelected] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string | null>(null)
  const [stickerOpen, setStickerOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [paper, setPaper] = useState<'dots' | 'grid' | 'plain'>(
    () => (localStorage.getItem('nous.mb.paper') as 'dots' | 'grid' | 'plain') ?? 'dots',
  )

  /** Trace en cours (non encore enregistre). */
  const [liveStroke, setLiveStroke] = useState<{ points: number[]; color: string; width: number } | null>(null)

  const undoStack = useRef<UndoOp[]>([])
  const dragState = useRef<
    | { kind: 'pan'; startX: number; startY: number; originX: number; originY: number }
    | { kind: 'move'; id: string; offsetX: number; offsetY: number; before: Partial<MoodElement> }
    | { kind: 'resize'; id: string; startW: number; startH: number; startX: number; startY: number; before: Partial<MoodElement> }
    | { kind: 'rotate'; id: string; cx: number; cy: number; startAngle: number; startRotation: number; before: Partial<MoodElement> }
    | { kind: 'draw'; points: number[] }
    | null
  >(null)
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchStart = useRef<{ dist: number; scale: number; cx: number; cy: number } | null>(null)

  const sorted = useMemo(() => [...items].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)), [items])
  const topZ = useMemo(() => items.reduce((m, e) => Math.max(m, e.z ?? 0), 0), [items])
  const selectedEl = selected ? items.find((e) => e.id === selected) ?? null : null

  useEffect(() => localStorage.setItem('nous.mb.paper', paper), [paper])

  /* --------------------------- Conversion de coordonnées --------------------------- */

  const toBoard = useCallback(
    (clientX: number, clientY: number) => {
      const rect = boardRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return {
        x: (clientX - rect.left - view.x) / view.scale,
        y: (clientY - rect.top - view.y) / view.scale,
      }
    },
    [view],
  )

  /* ------------------------------ Création d'éléments ------------------------------ */

  const base = (kind: MoodKind, x: number, y: number): Omit<MoodElement, 'id' | 'createdAt' | 'updatedAt'> => ({
    kind,
    x,
    y,
    w: 200,
    h: 120,
    rotation: 0,
    z: topZ + 1,
    color,
    authorId: me?.id,
  })

  const addElement = useCallback(
    async (data: Omit<MoodElement, 'id' | 'createdAt' | 'updatedAt'>, thenEdit = false) => {
      const el = await create(data)
      undoStack.current.push({ type: 'create', id: el.id })
      setSelected(el.id)
      if (thenEdit) setEditingText(el.id)
      return el
    },
    [create],
  )

  const addNote = (x: number, y: number) =>
    addElement(
      {
        ...base('note', x - 90, y - 60),
        w: 180,
        h: 150,
        color: NOTE_COLORS[Math.floor((topZ * 7 + 3) % NOTE_COLORS.length)],
        text: '',
        fontSize: 15,
      },
      true,
    )

  const addText = (x: number, y: number) =>
    addElement(
      { ...base('text', x - 110, y - 24), w: 240, h: 52, text: '', fontSize: 30 },
      true,
    )

  const addSticker = (emoji: string, x: number, y: number) =>
    addElement({ ...base('sticker', x - 40, y - 40), w: 80, h: 80, text: emoji, fontSize: 58 })

  const addShape = (x: number, y: number) =>
    addElement({ ...base('shape', x - 70, y - 70), w: 140, h: 140, shape: 'heart' })

  const addImages = useCallback(
    async (files: File[], x: number, y: number) => {
      let offset = 0
      for (const file of files) {
        try {
          const media = await uploadImage(file)
          await addElement({
            ...base('image', x - 130 + offset, y - 100 + offset),
            w: 260,
            h: 230,
            media,
          })
          offset += 22
        } catch (err) {
          notify(err instanceof Error ? err.message : 'Image impossible à ajouter', 'error')
        }
      }
    },
    [uploadImage, addElement, notify],
  )

  /* --------------------------------- Interaction --------------------------------- */

  const onPointerDownBoard = (e: React.PointerEvent) => {
    // Deux doigts : pincement (zoom + deplacement)
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current.size === 2) {
      const [a, b] = [...pinch.current.values()]
      pinchStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: view.scale,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
      }
      dragState.current = null
      setLiveStroke(null)
      return
    }

    const target = e.target as HTMLElement
    const onBackground = target === e.currentTarget || target.classList.contains('mb__paper') || target.classList.contains('mb__world')

    if (!onBackground) return

    setSelected(null)
    setEditingText(null)
    capture(e)

    const p = toBoard(e.clientX, e.clientY)

    if (tool === 'pen') {
      dragState.current = { kind: 'draw', points: [p.x, p.y] }
      setLiveStroke({ points: [p.x, p.y], color, width: strokeWidth })
      return
    }
    if (tool === 'note') return void addNote(p.x, p.y)
    if (tool === 'text') return void addText(p.x, p.y)
    if (tool === 'shape') return void addShape(p.x, p.y)
    if (tool === 'sticker') return setStickerOpen(true)
    if (tool === 'image') {
      return void pickFiles(true).then((files) => {
        if (files.length) void addImages(files, p.x, p.y)
      })
    }

    // select / eraser sur le fond : on se deplace
    dragState.current = {
      kind: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      originX: view.x,
      originY: view.y,
    }
  }

  const onPointerMoveBoard = (e: React.PointerEvent) => {
    if (pinch.current.has(e.pointerId)) {
      pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    // Pincement
    if (pinch.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pinch.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const ratio = dist / pinchStart.current.dist
      const nextScale = clamp(pinchStart.current.scale * ratio, MIN_SCALE, MAX_SCALE)
      const rect = boardRef.current!.getBoundingClientRect()
      const cx = (a.x + b.x) / 2 - rect.left
      const cy = (a.y + b.y) / 2 - rect.top
      setView((v) => {
        const k = nextScale / v.scale
        return { scale: nextScale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }
      })
      return
    }

    const st = dragState.current
    if (!st) return

    if (st.kind === 'pan') {
      setView((v) => ({
        ...v,
        x: st.originX + (e.clientX - st.startX),
        y: st.originY + (e.clientY - st.startY),
      }))
      return
    }

    if (st.kind === 'draw') {
      const p = toBoard(e.clientX, e.clientY)
      const pts = st.points
      const lastX = pts[pts.length - 2]
      const lastY = pts[pts.length - 1]
      // On ignore les micro-deplacements : moins de points, trace plus lisse.
      if (Math.hypot(p.x - lastX, p.y - lastY) < 1.6 / view.scale) return
      pts.push(p.x, p.y)
      setLiveStroke({ points: [...pts], color, width: strokeWidth })
      return
    }

    if (st.kind === 'move') {
      const p = toBoard(e.clientX, e.clientY)
      patchLocal(st.id, { x: p.x - st.offsetX, y: p.y - st.offsetY })
      return
    }

    if (st.kind === 'resize') {
      const p = toBoard(e.clientX, e.clientY)
      const w = Math.max(28, st.startW + (p.x - st.startX))
      const h = Math.max(28, st.startH + (p.y - st.startY))
      const el = items.find((x) => x.id === st.id)
      const patch: Partial<MoodElement> = { w, h }
      // Le texte et les autocollants grandissent avec leur boite.
      if (el && (el.kind === 'text' || el.kind === 'sticker')) {
        const ratio = h / Math.max(1, st.startH)
        patch.fontSize = Math.max(8, Math.round((st.before.fontSize ?? el.fontSize ?? 24) * ratio))
      }
      patchLocal(st.id, patch)
      return
    }

    if (st.kind === 'rotate') {
      const angle = Math.atan2(e.clientY - st.cy, e.clientX - st.cx)
      const deg = st.startRotation + ((angle - st.startAngle) * 180) / Math.PI
      patchLocal(st.id, { rotation: Math.round(deg) })
    }
  }

  const onPointerUpBoard = (e: React.PointerEvent) => {
    pinch.current.delete(e.pointerId)
    if (pinch.current.size < 2) pinchStart.current = null

    const st = dragState.current
    dragState.current = null

    if (!st) return

    if (st.kind === 'draw') {
      setLiveStroke(null)
      const pts = st.points
      if (pts.length < 4) return
      // Boite englobante -> points relatifs a l'element.
      const xs = pts.filter((_, i) => i % 2 === 0)
      const ys = pts.filter((_, i) => i % 2 === 1)
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)
      const w = Math.max(...xs) - minX
      const h = Math.max(...ys) - minY
      const rel: number[] = []
      for (let i = 0; i < pts.length; i += 2) {
        rel.push(pts[i] - minX, pts[i + 1] - minY)
      }
      void addElement({
        kind: 'stroke',
        x: minX,
        y: minY,
        w,
        h,
        rotation: 0,
        z: topZ + 1,
        color,
        strokeWidth,
        points: rel,
        authorId: me?.id,
      })
      setSelected(null)
      return
    }

    if (st.kind === 'move' || st.kind === 'resize' || st.kind === 'rotate') {
      const el = items.find((x) => x.id === st.id)
      if (el) {
        undoStack.current.push({ type: 'update', id: st.id, before: st.before })
        void update(st.id, {
          x: el.x, y: el.y, w: el.w, h: el.h,
          rotation: el.rotation, fontSize: el.fontSize,
        })
      }
    }
  }

  /* ------------------------------ Élément : pointeur ------------------------------ */

  const onElementPointerDown = (e: React.PointerEvent, el: MoodElement) => {
    if (tool === 'eraser') {
      e.stopPropagation()
      undoStack.current.push({ type: 'delete', item: el })
      void remove(el.id)
      return
    }
    if (tool === 'pen') return // on dessine par-dessus

    e.stopPropagation()
    capture(e)
    setSelected(el.id)

    const p = toBoard(e.clientX, e.clientY)
    dragState.current = {
      kind: 'move',
      id: el.id,
      offsetX: p.x - el.x,
      offsetY: p.y - el.y,
      before: { x: el.x, y: el.y },
    }
  }

  const startResize = (e: React.PointerEvent, el: MoodElement) => {
    e.stopPropagation()
    const p = toBoard(e.clientX, e.clientY)
    dragState.current = {
      kind: 'resize',
      id: el.id,
      startW: el.w,
      startH: el.h,
      startX: p.x,
      startY: p.y,
      before: { w: el.w, h: el.h, fontSize: el.fontSize },
    }
  }

  const startRotate = (e: React.PointerEvent, el: MoodElement) => {
    e.stopPropagation()
    const rect = boardRef.current!.getBoundingClientRect()
    const cx = rect.left + view.x + (el.x + el.w / 2) * view.scale
    const cy = rect.top + view.y + (el.y + el.h / 2) * view.scale
    dragState.current = {
      kind: 'rotate',
      id: el.id,
      cx,
      cy,
      startAngle: Math.atan2(e.clientY - cy, e.clientX - cx),
      startRotation: el.rotation ?? 0,
      before: { rotation: el.rotation ?? 0 },
    }
  }

  /* --------------------------------- Zoom molette --------------------------------- */

  useEffect(() => {
    const node = boardRef.current
    if (!node) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = node.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top

      if (e.ctrlKey || e.metaKey) {
        setView((v) => {
          const next = clamp(v.scale * (1 - e.deltaY * 0.0022), MIN_SCALE, MAX_SCALE)
          const k = next / v.scale
          return { scale: next, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }
        })
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
      }
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [])

  /* ------------------------------- Raccourcis ------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault()
        const el = items.find((x) => x.id === selected)
        if (el) {
          undoStack.current.push({ type: 'delete', item: el })
          void remove(el.id)
          setSelected(null)
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        void undo()
        return
      }
      if (e.key === 'Escape') {
        setSelected(null)
        setEditingText(null)
        setFullscreen(false)
        return
      }

      const map: Record<string, Tool> = {
        v: 'select', b: 'pen', e: 'eraser', t: 'text',
        n: 'note', s: 'sticker', i: 'image', f: 'shape',
      }
      if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()])
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, items])

  /* ---------------------------- Coller / déposer ---------------------------- */

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
      if (!files.length) return
      e.preventDefault()
      const rect = boardRef.current?.getBoundingClientRect()
      const center = rect
        ? toBoard(rect.left + rect.width / 2, rect.top + rect.height / 2)
        : { x: 0, y: 0 }
      void addImages(files, center.x, center.y)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addImages, toBoard])

  /* --------------------------------- Annuler --------------------------------- */

  const undo = async () => {
    const op = undoStack.current.pop()
    if (!op) return
    if (op.type === 'create') await remove(op.id)
    if (op.type === 'delete') {
      await create({ ...op.item, id: undefined as never })
    }
    if (op.type === 'update') await update(op.id, op.before)
  }

  /* --------------------------------- Actions --------------------------------- */

  const deleteSelected = () => {
    if (!selectedEl) return
    undoStack.current.push({ type: 'delete', item: selectedEl })
    void remove(selectedEl.id)
    setSelected(null)
  }

  const duplicateSelected = () => {
    if (!selectedEl) return
    const { id, createdAt, updatedAt, ...rest } = selectedEl
    void addElement({ ...rest, x: rest.x + 24, y: rest.y + 24, z: topZ + 1 })
  }

  const bringToFront = () => {
    if (!selectedEl) return
    void update(selectedEl.id, { z: topZ + 1 })
  }

  const recolorSelected = (c: string) => {
    if (!selectedEl) return
    void update(selectedEl.id, { color: c })
  }

  const resetView = () => setView({ x: 0, y: 0, scale: 1 })

  const fitAll = () => {
    if (!items.length || !boardRef.current) return resetView()
    const rect = boardRef.current.getBoundingClientRect()
    const minX = Math.min(...items.map((e) => e.x))
    const minY = Math.min(...items.map((e) => e.y))
    const maxX = Math.max(...items.map((e) => e.x + e.w))
    const maxY = Math.max(...items.map((e) => e.y + e.h))
    const w = Math.max(1, maxX - minX)
    const h = Math.max(1, maxY - minY)
    const scale = clamp(Math.min((rect.width - 80) / w, (rect.height - 120) / h), MIN_SCALE, 1.4)
    setView({
      scale,
      x: rect.width / 2 - (minX + w / 2) * scale,
      y: rect.height / 2 - (minY + h / 2) * scale,
    })
  }

  const clearAll = async () => {
    const ok = await confirm({
      title: 'Tout effacer ?',
      message: `Les ${items.length} éléments du moodboard seront supprimés. Cette action est définitive.`,
      confirmLabel: 'Tout effacer',
      danger: true,
    })
    if (!ok) return
    for (const el of items) await remove(el.id)
    undoStack.current = []
    setSelected(null)
  }

  /* ---------------------------------- Rendu ---------------------------------- */

  const hint =
    tool === 'pen'
      ? 'Dessinez librement — souris, doigt ou stylet'
      : tool === 'eraser'
        ? 'Touchez un élément pour l’effacer'
        : tool === 'select'
          ? 'Glissez pour vous déplacer · molette pour défiler · Ctrl+molette pour zoomer'
          : `Cliquez sur le tableau pour poser : ${TOOLS.find((t) => t.tool === tool)?.label.toLowerCase()}`

  return (
    <div className="page">
      {!fullscreen && (
        <PageHeader
          eyebrow="À quatre mains"
          title="Moodboard"
          subtitle="Un mur blanc. Dessinez, collez, écrivez — chacun de son côté, en même temps."
          actions={
            <>
              <Button icon="layers" onClick={fitAll}>
                Tout voir
              </Button>
              <Button icon="target" onClick={() => setFullscreen(true)}>
                Plein écran
              </Button>
            </>
          }
        />
      )}

      <div
        ref={boardRef}
        className={`mb ${fullscreen ? 'mb--fullscreen' : ''}`}
        onPointerDown={onPointerDownBoard}
        onPointerMove={onPointerMoveBoard}
        onPointerUp={onPointerUpBoard}
        onPointerCancel={onPointerUpBoard}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
          if (!files.length) return
          const p = toBoard(e.clientX, e.clientY)
          void addImages(files, p.x, p.y)
        }}
        style={{ cursor: tool === 'pen' ? 'crosshair' : tool === 'eraser' ? 'cell' : undefined }}
      >
        {/* Fond */}
        <div
          className={`mb__paper mb__paper--${paper}`}
          style={{
            backgroundSize:
              paper === 'plain'
                ? undefined
                : `${28 * view.scale}px ${28 * view.scale}px`,
            backgroundPosition: `${view.x}px ${view.y}px`,
          }}
        />

        {/* Monde */}
        <div
          className="mb__world"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          {sorted.map((el) => (
            <Element
              key={el.id}
              el={el}
              selected={selected === el.id}
              editing={editingText === el.id}
              interactive={tool === 'select' || tool === 'eraser'}
              onPointerDown={(e) => onElementPointerDown(e, el)}
              onDoubleClick={() => {
                if (el.kind === 'text' || el.kind === 'note') setEditingText(el.id)
              }}
              onTextChange={(text) => patchLocal(el.id, { text })}
              onTextCommit={(text) => {
                setEditingText(null)
                void update(el.id, { text })
              }}
              onStartResize={(e) => startResize(e, el)}
              onStartRotate={(e) => startRotate(e, el)}
            />
          ))}

          {/* Trace en cours */}
          {liveStroke && liveStroke.points.length >= 4 && (
            <svg
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                overflow: 'visible',
                pointerEvents: 'none',
              }}
            >
              <polyline
                points={pointsToString(liveStroke.points)}
                fill="none"
                stroke={liveStroke.color}
                strokeWidth={liveStroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* ------------------------------ Outils ------------------------------ */}
        <div className="mb-tools">
          {TOOLS.map((t) => (
            <button
              key={t.tool}
              type="button"
              className={`mb-tool ${tool === t.tool ? 'mb-tool--on' : ''}`}
              onClick={() => {
                setTool(t.tool)
                if (t.tool === 'sticker') setStickerOpen(true)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title={t.label}
              aria-label={t.label}
            >
              <Icon name={t.icon} size={18} />
            </button>
          ))}

          <span className="mb-tools__sep" />

          <button
            type="button"
            className="mb-tool"
            onClick={() => void undo()}
            onPointerDown={(e) => e.stopPropagation()}
            title="Annuler (Ctrl+Z)"
            aria-label="Annuler"
          >
            <Icon name="undo" size={18} />
          </button>
          <button
            type="button"
            className="mb-tool"
            onClick={() => setPaper(paper === 'dots' ? 'grid' : paper === 'grid' ? 'plain' : 'dots')}
            onPointerDown={(e) => e.stopPropagation()}
            title="Changer le fond"
            aria-label="Changer le fond"
          >
            <Icon name="grid" size={18} />
          </button>
          {fullscreen && (
            <button
              type="button"
              className="mb-tool"
              onClick={() => setFullscreen(false)}
              onPointerDown={(e) => e.stopPropagation()}
              title="Quitter le plein écran"
              aria-label="Quitter le plein écran"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>

        {/* --------------------------- Couleurs / taille --------------------------- */}
        {(tool === 'pen' || tool === 'text' || tool === 'note' || tool === 'shape' || selectedEl) && (
          <motion.div
            className="mb-panel"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {(selectedEl?.kind === 'note' ? NOTE_COLORS : COLORS).map((c) => (
              <button
                key={c}
                type="button"
                className={`mb-swatch ${(selectedEl ? selectedEl.color : color) === c ? 'mb-swatch--on' : ''}`}
                style={{ background: c }}
                onClick={() => {
                  setColor(c)
                  if (selectedEl) recolorSelected(c)
                }}
                aria-label={`Couleur ${c}`}
              />
            ))}

            {tool === 'pen' && !selectedEl && (
              <>
                <span className="mb-tools__sep" />
                <input
                  className="mb-size"
                  type="range"
                  min={1}
                  max={30}
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  aria-label="Épaisseur"
                />
                <span style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-3)', minWidth: 22 }}>
                  {strokeWidth}
                </span>
              </>
            )}

            {selectedEl && (
              <>
                <span className="mb-tools__sep" />
                <button className="mb-tool" onClick={duplicateSelected} title="Dupliquer" aria-label="Dupliquer">
                  <Icon name="layers" size={17} />
                </button>
                <button className="mb-tool" onClick={bringToFront} title="Mettre devant" aria-label="Mettre devant">
                  <Icon name="upload" size={17} />
                </button>
                <button
                  className="mb-tool"
                  onClick={deleteSelected}
                  title="Supprimer"
                  aria-label="Supprimer"
                  style={{ color: '#b4433f' }}
                >
                  <Icon name="trash" size={17} />
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* -------------------------------- Zoom -------------------------------- */}
        <div className="mb-zoom" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="mb-tool"
            style={{ width: 32, height: 32, minWidth: 32 }}
            onClick={() => setView((v) => ({ ...v, scale: clamp(v.scale / 1.25, MIN_SCALE, MAX_SCALE) }))}
            aria-label="Dézoomer"
          >
            <Icon name="zoom-out" size={16} />
          </button>
          <button className="mb-zoom__level" onClick={fitAll} title="Tout voir">
            {Math.round(view.scale * 100)}%
          </button>
          <button
            className="mb-tool"
            style={{ width: 32, height: 32, minWidth: 32 }}
            onClick={() => setView((v) => ({ ...v, scale: clamp(v.scale * 1.25, MIN_SCALE, MAX_SCALE) }))}
            aria-label="Zoomer"
          >
            <Icon name="zoom-in" size={16} />
          </button>
        </div>

        <div className="mb-hint">
          <Icon name={TOOLS.find((t) => t.tool === tool)?.icon ?? 'cursor'} size={13} />
          <span className="truncate">{hint}</span>
        </div>
      </div>

      {!fullscreen && (
        <div className="row wrap" style={{ gap: 10, justifyContent: 'space-between' }}>
          <span className="dim" style={{ fontSize: 'var(--t-xs)' }}>
            {items.length} élément{items.length > 1 ? 's' : ''} · raccourcis : V déplacer, B pinceau, E gomme,
            T texte, N post-it, S autocollant, I photo
          </span>
          {items.length > 0 && (
            <Button variant="danger" size="sm" icon="trash" onClick={() => void clearAll()}>
              Tout effacer
            </Button>
          )}
        </div>
      )}

      {/* ------------------------------ Autocollants ------------------------------ */}
      <Modal open={stickerOpen} onClose={() => setStickerOpen(false)} title="Autocollants" size="narrow">
        <div className="sticker-grid">
          {STICKERS.map((s) => (
            <button
              key={s}
              type="button"
              className="sticker-btn"
              onClick={() => {
                const rect = boardRef.current?.getBoundingClientRect()
                const c = rect
                  ? toBoard(rect.left + rect.width / 2, rect.top + rect.height / 2)
                  : { x: 0, y: 0 }
                void addSticker(s, c.x + (Math.floor(topZ % 5) - 2) * 30, c.y)
                setStickerOpen(false)
                setTool('select')
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </Modal>

      {confirmNode}
    </div>
  )
}

/* ------------------------------ Un élément ------------------------------ */

const pointsToString = (pts: number[]) => {
  const out: string[] = []
  for (let i = 0; i < pts.length; i += 2) out.push(`${pts[i]},${pts[i + 1]}`)
  return out.join(' ')
}

function Element({
  el,
  selected,
  editing,
  interactive,
  onPointerDown,
  onDoubleClick,
  onTextChange,
  onTextCommit,
  onStartResize,
  onStartRotate,
}: {
  el: MoodElement
  selected: boolean
  editing: boolean
  interactive: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onDoubleClick: () => void
  onTextChange: (t: string) => void
  onTextCommit: (t: string) => void
  onStartResize: (e: React.PointerEvent) => void
  onStartRotate: (e: React.PointerEvent) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editing])

  const style: React.CSSProperties = {
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    zIndex: el.z ?? 0,
  }

  const body = () => {
    switch (el.kind) {
      case 'stroke':
        return (
          <svg
            width={el.w + (el.strokeWidth ?? 4) * 2}
            height={el.h + (el.strokeWidth ?? 4) * 2}
            style={{
              position: 'absolute',
              left: -(el.strokeWidth ?? 4),
              top: -(el.strokeWidth ?? 4),
              overflow: 'visible',
              pointerEvents: 'none',
            }}
          >
            <polyline
              points={pointsToString(
                (el.points ?? []).map((v, i) =>
                  i % 2 === 0 ? v + (el.strokeWidth ?? 4) : v + (el.strokeWidth ?? 4),
                ),
              )}
              fill="none"
              stroke={el.color}
              strokeWidth={el.strokeWidth ?? 4}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: 'stroke' }}
            />
          </svg>
        )

      case 'note':
        return (
          <div className="mbel__note" style={{ background: el.color, fontSize: el.fontSize ?? 15 }}>
            {editing ? (
              <textarea
                ref={ref}
                className="mbel__editor"
                value={el.text ?? ''}
                onChange={(e) => onTextChange(e.target.value)}
                onBlur={(e) => onTextCommit(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Écris…"
              />
            ) : (
              el.text || <span style={{ opacity: 0.35 }}>Double-clic pour écrire</span>
            )}
          </div>
        )

      case 'text':
        return (
          <div
            className="mbel__text"
            style={{ color: el.color, fontSize: el.fontSize ?? 30 }}
          >
            {editing ? (
              <textarea
                ref={ref}
                className="mbel__editor"
                value={el.text ?? ''}
                onChange={(e) => onTextChange(e.target.value)}
                onBlur={(e) => onTextCommit(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                style={{ fontSize: el.fontSize ?? 30, fontFamily: 'var(--font-display)' }}
                placeholder="Écris…"
              />
            ) : (
              el.text || <span style={{ opacity: 0.3 }}>Double-clic</span>
            )}
          </div>
        )

      case 'sticker':
        return (
          <div className="mbel__sticker" style={{ fontSize: el.fontSize ?? 58 }}>
            {el.text}
          </div>
        )

      case 'image':
        return (
          <div className="mbel__image">
            <Img media={el.media} alt="" />
          </div>
        )

      case 'shape':
        return el.shape === 'heart' ? (
          <svg viewBox="0 0 24 24" width="100%" height="100%" style={{ display: 'block' }}>
            <path
              d="M12 21.3C6.2 17.2 2.5 13.6 2.5 9.4A5.2 5.2 0 0 1 12 6.4a5.2 5.2 0 0 1 9.5 3c0 4.2-3.7 7.8-9.5 11.9z"
              fill={el.color}
            />
          </svg>
        ) : el.shape === 'ellipse' ? (
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: el.color }} />
        ) : (
          <div style={{ width: '100%', height: '100%', borderRadius: 8, background: el.color }} />
        )

      default:
        return null
    }
  }

  return (
    <div
      className={`mbel ${interactive ? 'mbel--interactive' : ''} ${selected ? 'mbel--selected' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {body()}

      {selected && interactive && (
        <>
          <span className="mb__handle mb__handle--resize" onPointerDown={onStartResize} />
          <span className="mb__handle mb__handle--rotate" onPointerDown={onStartRotate}>
            <Icon name="undo" size={9} strokeWidth={2.4} />
          </span>
        </>
      )}
    </div>
  )
}
