/* ------------------------------------------------------------------
   La vue Jour, avec son bandeau de dates.

   Elle existe parce que la grille Semaine à sept colonnes a été jugée trop
   compacte sur un téléphone réel : « faut cliquer sur un jour, genre on a tous
   les jours de la semaine et quand on clique ça montre le jour ».

   Le bandeau porte la semaine ; le jour tapé s'ouvre en pleine largeur. Les
   gestes du calendrier survivent tous, et deviennent même plus faciles : une
   seule colonne, donc plus de déplacement latéral à arbitrer, et des cartes
   assez larges pour qu'on lise enfin les titres.
   ------------------------------------------------------------------ */

import { DAYS_PER_WEEK, SLOTS_PER_DAY, clamp, formatRange, moveWindow, resizeEnd, resizeStart, slotAt, snapSlot } from './domain/time.js'
import { layoutDay } from './domain/layout.js'
import { DAY_LABELS, demoWeek } from './data/demo.js'
import * as meter from './frame-meter.js'

/** @typedef {import('./data/demo.js').DemoEvent} DemoEvent */
/** @typedef {import('./domain/time.js').SlotWindow} SlotWindow */

const SLOT_BASE_H = 30
const ZOOM_MIN = 0.8
const ZOOM_MAX = 1.8
const LONG_PRESS_MS = 350
const MOVE_TOLERANCE = 8
const EDGE_AUTOSCROLL = 56
const PAGER_ENGAGE = 24
const PAGER_COMMIT = 60

const strip = /** @type {HTMLElement} */ (document.getElementById('daystrip'))
const scroller = /** @type {HTMLElement} */ (document.getElementById('dayscroller'))
const canvas = /** @type {HTMLElement} */ (document.getElementById('daycanvas'))
const colEl = /** @type {HTMLElement} */ (document.getElementById('daycol'))
const gutterEl = /** @type {HTMLElement} */ (document.getElementById('daygutter'))
const titleEl = /** @type {HTMLElement} */ (document.getElementById('daytitle'))

/** Semaine affichée, relative à la semaine en cours. */
let weekOffset = 0
/** Jour sélectionné dans la semaine affichée, 0 = lundi. */
let day = (new Date().getDay() + 6) % 7
/** @type {DemoEvent[]} */
let events = demoWeek(0)
/** @type {string | null} */
let selectedId = null
let zoom = 1

/** @type {Map<string, HTMLElement>} */
const blocks = new Map()
/** @type {HTMLElement | null} */
let ghost = null

const slotH = () => SLOT_BASE_H * zoom

/* ------------------------------- dates ------------------------------- */

/** @type {(offset: number) => Date} */
function mondayOf(offset) {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

/** @type {(offset: number, index: number) => Date} */
function dateOf(offset, index) {
  const d = mondayOf(offset)
  d.setDate(d.getDate() + index)
  return d
}

const isToday = (/** @type {Date} */ d) => {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return d.getTime() === t.getTime()
}

/* ------------------------------ bandeau ------------------------------ */

function buildStrip() {
  for (let d = 0; d < DAYS_PER_WEEK; d += 1) {
    const b = document.createElement('button')
    b.className = 'dcell'
    b.dataset.day = String(d)
    b.innerHTML = '<span class="w"></span><span class="n"></span><span class="m"></span>'
    b.addEventListener('click', () => selectDay(d))
    strip.appendChild(b)
  }
}

/** Marques d'un jour : ni pastille ni titre, juste ce qui s'y trouve. */
function marksFor(/** @type {number} */ d) {
  const of = events.filter((e) => e.window.day === d)
  /** @type {string[]} */
  const out = []
  for (const e of of.slice(0, 4)) {
    if (e.kind === 'nous') out.push('<i class="mk nous">♥</i>')
    else if (e.kind === 'proposed') out.push('<i class="mk prop">♡</i>')
    else out.push(`<i class="mk dot" style="background:${e.personColor ?? 'var(--ink-3)'}"></i>`)
  }
  if (of.length > 4) out.push('<i class="mk more">·</i>')
  return out.join('')
}

function paintStrip() {
  strip.querySelectorAll('.dcell').forEach((el, d) => {
    const date = dateOf(weekOffset, d)
    const cell = /** @type {HTMLElement} */ (el)
    const w = cell.querySelector('.w')
    const n = cell.querySelector('.n')
    const m = cell.querySelector('.m')
    if (w) w.textContent = (DAY_LABELS[d] ?? '').slice(0, 3)
    if (n) n.textContent = String(date.getDate())
    if (m) m.innerHTML = (isToday(date) ? '<i class="mk today">♥</i>' : '') + marksFor(d)
    cell.toggleAttribute('data-sel', d === day)
    cell.toggleAttribute('data-today', isToday(date))
  })
  const date = dateOf(weekOffset, day)
  titleEl.textContent = isToday(date)
    ? "aujourd'hui"
    : date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** @type {(d: number) => void} */
function selectDay(d) {
  day = clamp(d, 0, DAYS_PER_WEEK - 1)
  selectedId = null
  paintStrip()
  renderDay()
}

/** @type {(dir: number) => void} */
function shiftDay(dir) {
  const next = day + dir
  if (next < 0) { weekOffset -= 1; events = demoWeek(weekOffset); day = 6 }
  else if (next > 6) { weekOffset += 1; events = demoWeek(weekOffset); day = 0 }
  else day = next
  selectedId = null
  paintStrip()
  renderDay()
}

/* -------------------------------- jour -------------------------------- */

function buildStatic() {
  for (let h = 0; h < 24; h += 1) {
    const s = document.createElement('span')
    s.textContent = `${h} h`
    gutterEl.appendChild(s)
  }
  const now = document.createElement('div')
  now.className = 'now'
  now.id = 'daynow'
  colEl.appendChild(now)
}

function applySizes() {
  const h = slotH()
  canvas.style.height = `${SLOTS_PER_DAY * h}px`
  gutterEl.querySelectorAll('span').forEach((s, i) => {
    ;/** @type {HTMLElement} */ (s).style.top = `${i * 2 * h}px`
  })
  const line = document.getElementById('daynow')
  if (line) {
    const d = new Date()
    line.style.top = `${((d.getHours() * 60 + d.getMinutes()) / 30) * h}px`
    line.style.display = isToday(dateOf(weekOffset, day)) ? '' : 'none'
  }
}

function renderDay() {
  blocks.forEach((el) => el.remove())
  blocks.clear()
  const h = slotH()
  const dayEvents = events.filter((e) => e.window.day === day)
  const placements = layoutDay(
    dayEvents.map((e) => ({ id: e.id, startSlot: e.window.startSlot, endSlot: e.window.endSlot })),
  )

  for (const ev of dayEvents) {
    const p = placements.find((x) => x.id === ev.id)
    if (!p) continue
    const el = document.createElement('div')
    el.className = 'ev'
    el.dataset.id = ev.id
    el.dataset.kind = ev.kind
    if (ev.personColor) {
      el.style.background = tint(ev.personColor, 0.14)
      el.style.boxShadow = `0 1px 2px ${tint(ev.personColor, 0.28)}`
    }
    const width = 100 / p.columns
    el.style.left = `calc(${p.column * width}% + ${4 + p.nested * 10}px)`
    el.style.width = `calc(${width}% - ${8 + p.nested * 10}px)`
    el.style.top = `${ev.window.startSlot * h}px`
    el.style.height = `${(ev.window.endSlot - ev.window.startSlot) * h - 3}px`
    el.innerHTML =
      `<div class="t">${ev.title}</div><div class="r">${formatRange(ev.window)}</div>`
    if (ev.id === selectedId) {
      el.setAttribute('data-sel', '')
      el.insertAdjacentHTML(
        'beforeend',
        '<div class="handle" data-edge="start"></div><div class="handle" data-edge="end"></div>',
      )
    }
    colEl.appendChild(el)
    blocks.set(ev.id, el)
  }
  applySizes()
}

/** @type {(hex: string, alpha: number) => string} */
function tint(hex, alpha) {
  const h = hex.replace('#', '')
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${alpha})`
}

/* ------------------------------ gestes ------------------------------ */

/**
 * @typedef {{
 *   kind: 'move' | 'resize-start' | 'resize-end' | 'create',
 *   id: string, base: SlotWindow, startY: number, scrollTop0: number, lastSlots: number
 * }} Drag
 */

/** @type {Drag | null} */
let drag = null
/** @type {number | undefined} */
let pressTimer
/** @type {{ x: number, y: number, id: string | null, onBackground: boolean } | null} */
let press = null
/** @type {{ startX: number, dx: number, engaged: boolean } | null} */
let pager = null
/** @type {Map<number, { x: number, y: number }>} */
const pointers = new Map()
/** @type {{ dist: number, zoom0: number, focalY: number, contentY: number } | null} */
let pinch = null
let autoScroll = 0
/** @type {number | undefined} */
let autoRaf

const vibrate = (/** @type {number} */ ms) => { if (navigator.vibrate) navigator.vibrate(ms) }

scroller.addEventListener('pointerdown', onPointerDown)
scroller.addEventListener('pointermove', onPointerMove)
scroller.addEventListener('pointerup', onPointerUp)
scroller.addEventListener('pointercancel', onPointerUp)
scroller.addEventListener('touchmove', (e) => { if (drag || pinch || pager?.engaged) e.preventDefault() }, { passive: false })
scroller.addEventListener('contextmenu', (e) => e.preventDefault())
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  scroller.addEventListener(type, (e) => e.preventDefault())
}

/** @type {(e: PointerEvent) => void} */
function onPointerDown(e) {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 2) { startPinch(); return }
  if (pointers.size > 2 || drag) return

  const target = /** @type {HTMLElement} */ (e.target)
  const handle = target.closest('.handle')
  const block = target.closest('.ev')

  meter.arm()

  if (handle && block) {
    const id = /** @type {string} */ (/** @type {HTMLElement} */ (block).dataset.id)
    const ev = events.find((x) => x.id === id)
    if (!ev) return
    beginDrag(/** @type {HTMLElement} */ (handle).dataset.edge === 'start' ? 'resize-start' : 'resize-end', id, ev.window, e)
    return
  }

  press = { x: e.clientX, y: e.clientY, id: block ? /** @type {string} */ (/** @type {HTMLElement} */ (block).dataset.id) : null, onBackground: !block }
  pager = { startX: e.clientX, dx: 0, engaged: false }

  pressTimer = window.setTimeout(() => {
    if (!press) return
    if (press.id) {
      const ev = events.find((x) => x.id === press?.id)
      if (!ev) return
      selectedId = ev.id
      renderDay()
      beginDrag('move', ev.id, ev.window, e)
      blocks.get(ev.id)?.setAttribute('data-lift', '')
      vibrate(12)
    } else if (press.onBackground) {
      const rect = colEl.getBoundingClientRect()
      const start = slotAt(press.y - rect.top, slotH())
      const w = { day, startSlot: start, endSlot: Math.min(start + 2, SLOTS_PER_DAY) }
      ghost = document.createElement('div')
      ghost.className = 'ghost'
      ghost.style.top = `${w.startSlot * slotH()}px`
      ghost.style.height = `${(w.endSlot - w.startSlot) * slotH()}px`
      colEl.appendChild(ghost)
      beginDrag('create', '', w, e)
      vibrate(12)
    }
  }, LONG_PRESS_MS)
}

/** @type {(kind: Drag['kind'], id: string, base: SlotWindow, e: PointerEvent) => void} */
function beginDrag(kind, id, base, e) {
  drag = { kind, id, base, startY: e.clientY, scrollTop0: scroller.scrollTop, lastSlots: 0 }
  pager = null
  scroller.setPointerCapture(e.pointerId)
  startAutoScroll()
}

/** @type {(e: PointerEvent) => void} */
function onPointerMove(e) {
  const p = pointers.get(e.pointerId)
  if (p) { p.x = e.clientX; p.y = e.clientY }
  if (pinch) { updatePinch(); return }

  if (!drag && press) {
    const dx = e.clientX - press.x
    const dy = e.clientY - press.y
    if (Math.hypot(dx, dy) > MOVE_TOLERANCE) {
      window.clearTimeout(pressTimer)
      if (pager && !pager.engaged && Math.abs(dx) > PAGER_ENGAGE && Math.abs(dx) > Math.abs(dy) * 1.7) {
        pager.engaged = true
      }
    }
    if (pager?.engaged) {
      pager.dx = dx
      canvas.style.transform = `translateX(${dx * 0.5}px)`
      canvas.style.opacity = String(1 - Math.min(0.4, Math.abs(dx) / 320))
    }
    return
  }
  if (!drag) return

  autoScroll = edgeSpeed(e.clientY)
  const dy = e.clientY - drag.startY + (scroller.scrollTop - drag.scrollTop0)
  const slots = Math.round(dy / slotH())
  if (slots !== drag.lastSlots) { drag.lastSlots = slots; vibrate(4) }

  if (drag.kind === 'move') paint(drag.id, moveWindow(drag.base, slots, 0))
  else if (drag.kind === 'resize-start') paint(drag.id, resizeStart(drag.base, slots))
  else if (drag.kind === 'resize-end') paint(drag.id, resizeEnd(drag.base, slots))
  else if (drag.kind === 'create' && ghost) {
    const rect = colEl.getBoundingClientRect()
    const end = clamp(snapSlot(e.clientY - rect.top, slotH()), drag.base.startSlot + 1, SLOTS_PER_DAY)
    ghost.style.height = `${(end - drag.base.startSlot) * slotH()}px`
    drag.base = { ...drag.base, endSlot: end }
  }
}

/** @type {(e: PointerEvent) => void} */
function onPointerUp(e) {
  pointers.delete(e.pointerId)
  if (pinch && pointers.size < 2) { pinch = null; meter.disarm(); return }
  window.clearTimeout(pressTimer)
  stopAutoScroll()

  if (pager?.engaged) {
    const dx = pager.dx
    canvas.style.transition = 'transform .22s ease-out, opacity .22s ease-out'
    canvas.style.transform = 'translateX(0)'
    canvas.style.opacity = '1'
    window.setTimeout(() => { canvas.style.transition = '' }, 240)
    if (Math.abs(dx) > PAGER_COMMIT) shiftDay(dx < 0 ? 1 : -1)
    pager = null; press = null; meter.disarm()
    return
  }

  if (drag) {
    const d = drag
    drag = null
    if (d.kind === 'create' && ghost) {
      ghost.remove(); ghost = null
      const id = `n${events.length}${d.base.startSlot}`
      events = [...events, { id, title: 'Nouveau', kind: 'nous', window: d.base }]
      selectedId = id
    } else if (d.kind === 'move') commit(d.id, moveWindow(d.base, d.lastSlots, 0))
    else if (d.kind === 'resize-start') commit(d.id, resizeStart(d.base, d.lastSlots))
    else if (d.kind === 'resize-end') commit(d.id, resizeEnd(d.base, d.lastSlots))
    renderDay()
    paintStrip()
    meter.disarm()
    press = null
    return
  }

  if (press) {
    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y) > MOVE_TOLERANCE
    if (!moved) { selectedId = press.id; renderDay() }
  }
  press = null; pager = null
  meter.disarm()
}

/** @type {(id: string, w: SlotWindow) => void} */
function commit(id, w) {
  events = events.map((e) => (e.id === id ? { ...e, window: w } : e))
}

/** @type {(id: string, w: SlotWindow) => void} */
function paint(id, w) {
  const el = blocks.get(id)
  if (!el) return
  const h = slotH()
  el.style.top = `${w.startSlot * h}px`
  el.style.height = `${(w.endSlot - w.startSlot) * h - 3}px`
  const r = el.querySelector('.r')
  if (r) r.textContent = formatRange(w)
}

/* ------------------------ défilement et pincement ------------------------ */

/** @type {(y: number) => number} */
function edgeSpeed(y) {
  const r = scroller.getBoundingClientRect()
  if (y < r.top + EDGE_AUTOSCROLL) return -Math.min(14, (r.top + EDGE_AUTOSCROLL - y) / 4)
  if (y > r.bottom - EDGE_AUTOSCROLL) return Math.min(14, (y - (r.bottom - EDGE_AUTOSCROLL)) / 4)
  return 0
}

function startAutoScroll() {
  if (autoRaf) return
  const step = () => {
    if (!drag) { autoRaf = undefined; return }
    if (autoScroll) scroller.scrollTop += autoScroll
    autoRaf = requestAnimationFrame(step)
  }
  autoRaf = requestAnimationFrame(step)
}

function stopAutoScroll() {
  autoScroll = 0
  if (autoRaf) { cancelAnimationFrame(autoRaf); autoRaf = undefined }
}

function startPinch() {
  window.clearTimeout(pressTimer)
  press = null; pager = null
  const [a, b] = [...pointers.values()]
  if (!a || !b) return
  const focalY = (a.y + b.y) / 2
  const rect = scroller.getBoundingClientRect()
  pinch = {
    dist: Math.hypot(a.x - b.x, a.y - b.y),
    zoom0: zoom,
    focalY,
    contentY: scroller.scrollTop + (focalY - rect.top),
  }
  meter.arm()
}

function updatePinch() {
  if (!pinch) return
  const [a, b] = [...pointers.values()]
  if (!a || !b) return
  const dist = Math.hypot(a.x - b.x, a.y - b.y)
  const next = clamp((pinch.zoom0 * dist) / pinch.dist, ZOOM_MIN, ZOOM_MAX)
  const ratio = next / pinch.zoom0
  zoom = next
  renderDay()
  const rect = scroller.getBoundingClientRect()
  scroller.scrollTop = pinch.contentY * ratio - (pinch.focalY - rect.top)
}

/* ------------------------- bandeau : semaine ± 1 ------------------------- */

/** @type {{ x: number, engaged: boolean } | null} */
let stripPan = null
strip.addEventListener('pointerdown', (e) => { stripPan = { x: e.clientX, engaged: false } })
strip.addEventListener('pointermove', (e) => {
  if (!stripPan) return
  const dx = e.clientX - stripPan.x
  if (!stripPan.engaged && Math.abs(dx) > PAGER_ENGAGE) stripPan.engaged = true
  if (stripPan.engaged) strip.style.transform = `translateX(${dx * 0.4}px)`
})
strip.addEventListener('pointerup', (e) => {
  if (!stripPan) return
  const dx = e.clientX - stripPan.x
  strip.style.transition = 'transform .22s ease-out'
  strip.style.transform = 'translateX(0)'
  window.setTimeout(() => { strip.style.transition = '' }, 240)
  if (stripPan.engaged && Math.abs(dx) > PAGER_COMMIT) {
    weekOffset += dx < 0 ? 1 : -1
    events = demoWeek(weekOffset)
    selectedId = null
    paintStrip()
    renderDay()
  }
  stripPan = null
})

/* -------------------------------- init -------------------------------- */

export function mountDay() {
  buildStrip()
  buildStatic()
  paintStrip()
  renderDay()
  // 10 px de marge pour que le repère « 7 h » ne soit pas coupé en deux
  requestAnimationFrame(() => { scroller.scrollTop = 7 * 2 * slotH() - 10 })
}

/** Revenir à aujourd'hui, depuis le titre. */
export function today() {
  weekOffset = 0
  events = demoWeek(0)
  day = (new Date().getDay() + 6) % 7
  selectedId = null
  paintStrip()
  renderDay()
  scroller.scrollTop = Math.max(0, (new Date().getHours() * 2 - 2) * slotH())
}
