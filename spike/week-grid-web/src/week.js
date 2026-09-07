/* ------------------------------------------------------------------
   La grille Semaine, en web.

   C'est le pendant de spike/week-grid (React Native) : mêmes gestes, mêmes
   règles d'arbitrage, même logique de domaine. Elle sert à répondre à une
   seule question, sur l'iPhone 16 : une PWA peut-elle tenir le calendrier de
   Nous, ou faut-il renoncer à quelque chose ?

   Arbitrage des gestes (identique au spike natif) :
   - le défilement vertical appartient au navigateur (`touch-action: pan-y`) ;
   - un appui de 350 ms sans bouger de plus de 8 px prend la main : à partir de
     là on annule le défilement (preventDefault sur un écouteur non passif) ;
   - le pincement (2 doigts) change la hauteur de créneau en gardant le point
     focal — `pan-y` empêche le navigateur de zoomer la page à notre place ;
   - un déplacement horizontal franc (≥ 24 px, angle < 30°) change de semaine.
   ------------------------------------------------------------------ */

import { DAYS_PER_WEEK, SLOTS_PER_DAY, clamp, formatRange, moveWindow, resizeEnd, resizeStart, slotAt, snapSlot } from './domain/time.js'
import { layoutDay } from './domain/layout.js'
import { DAY_LABELS, demoWeek } from './data/demo.js'
import * as meter from './frame-meter.js'

/** @typedef {import('./data/demo.js').DemoEvent} DemoEvent */
/** @typedef {import('./domain/time.js').SlotWindow} SlotWindow */

const SLOT_BASE_H = 30
const ZOOM_MIN = 0.8
const ZOOM_MAX = 1.6
const LONG_PRESS_MS = 350
const MOVE_TOLERANCE = 8
const EDGE_AUTOSCROLL = 56
const PAGER_ENGAGE = 24
const PAGER_COMMIT = 60

const scroller = /** @type {HTMLElement} */ (document.getElementById('scroller'))
const canvas = /** @type {HTMLElement} */ (document.getElementById('canvas'))
const colsEl = /** @type {HTMLElement} */ (document.getElementById('cols'))
const gutterEl = /** @type {HTMLElement} */ (document.getElementById('gutter'))
const headEl = /** @type {HTMLElement} */ (document.getElementById('weekhead'))

let weekOffset = 0
/** @type {DemoEvent[]} */
let events = demoWeek(0)
/** @type {string | null} */
let selectedId = null
/** @type {number | null} */
let focusDay = null
let zoom = 1

/** @type {HTMLElement[]} */
const columns = []
/** @type {Map<string, HTMLElement>} */
const blocks = new Map()
/** @type {HTMLElement | null} */
let ghost = null

const slotH = () => SLOT_BASE_H * zoom

/* ------------------------------- rendu ------------------------------- */

function buildStatic() {
  for (let h = 0; h < 24; h += 1) {
    const s = document.createElement('span')
    s.textContent = `${h} h`
    gutterEl.appendChild(s)
  }
  for (let d = 0; d < DAYS_PER_WEEK; d += 1) {
    const col = document.createElement('div')
    col.className = 'col'
    col.dataset.day = String(d)
    colsEl.appendChild(col)
    columns.push(col)

    const head = document.createElement('button')
    head.className = 'dayhead'
    head.dataset.day = String(d)
    head.addEventListener('click', () => {
      focusDay = focusDay === d ? null : d
      applyFocus()
    })
    headEl.appendChild(head)
  }
  paintDates()
  const now = document.createElement('div')
  now.className = 'now'
  now.id = 'nowline'
  colsEl.appendChild(now)
}

/** Lundi de la semaine affichée. @type {(offset: number) => Date} */
function mondayOf(offset) {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Numéros du jour et marque « aujourd'hui » dans les en-têtes. */
function paintDates() {
  const monday = mondayOf(weekOffset)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  headEl.querySelectorAll('.dayhead').forEach((el, d) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + d)
    el.innerHTML = `<span class="d">${date.getDate()}</span>${DAY_LABELS[d]}`
    el.toggleAttribute('data-today', date.getTime() === today.getTime())
  })
  const nowLine = document.getElementById('nowline')
  if (nowLine) nowLine.style.display = weekOffset === 0 ? '' : 'none'
}

function applySizes() {
  const h = slotH()
  canvas.style.height = `${SLOTS_PER_DAY * h}px`
  gutterEl.querySelectorAll('span').forEach((s, i) => {
    ;/** @type {HTMLElement} */ (s).style.top = `${i * 2 * h}px`
  })
  const nowLine = document.getElementById('nowline')
  if (nowLine) {
    const d = new Date()
    nowLine.style.top = `${((d.getHours() * 60 + d.getMinutes()) / 30) * h}px`
  }
}

function applyFocus() {
  columns.forEach((col, d) => {
    col.toggleAttribute('data-focus', focusDay === d)
    col.toggleAttribute('data-dim', focusDay !== null && focusDay !== d)
  })
  headEl.querySelectorAll('.dayhead').forEach((el, d) => {
    el.toggleAttribute('data-focus', focusDay === d)
  })
}

function renderEvents() {
  blocks.forEach((el) => el.remove())
  blocks.clear()
  const h = slotH()

  for (let d = 0; d < DAYS_PER_WEEK; d += 1) {
    const dayEvents = events.filter((e) => e.window.day === d)
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
      el.style.left = `calc(${p.column * width}% + ${3 + p.nested * 7}px)`
      el.style.width = `calc(${width}% - ${6 + p.nested * 7}px)`
      el.style.top = `${ev.window.startSlot * h}px`
      el.style.height = `${(ev.window.endSlot - ev.window.startSlot) * h - 2}px`
      el.innerHTML =
        `<div class="t">${ev.title}</div>` +
        ((ev.window.endSlot - ev.window.startSlot) * h > 40
          ? `<div class="r">${formatRange(ev.window)}</div>`
          : '')
      if (ev.id === selectedId) {
        el.setAttribute('data-sel', '')
        el.insertAdjacentHTML(
          'beforeend',
          '<div class="handle" data-edge="start"></div><div class="handle" data-edge="end"></div>',
        )
      }
      const col = columns[d]
      if (col) col.appendChild(el)
      blocks.set(ev.id, el)
    }
  }
}

/** @type {(hex: string, alpha: number) => string} */
function tint(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/* ------------------------------ gestes ------------------------------ */

/**
 * @typedef {{
 *   kind: 'move' | 'resize-start' | 'resize-end' | 'create',
 *   id: string, base: SlotWindow, startY: number, startX: number,
 *   scrollTop0: number, lastSlots: number
 * }} Drag
 */

/** @type {Drag | null} */
let drag = null
/** @type {number | undefined} */
let pressTimer
/** @type {{ x: number, y: number, id: string | null, edge: string | null, day: number | null } | null} */
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
// écouteur NON passif : c'est lui qui reprend le défilement au navigateur
scroller.addEventListener('touchmove', (e) => { if (drag || pinch || pager?.engaged) e.preventDefault() }, { passive: false })
scroller.addEventListener('contextmenu', (e) => e.preventDefault())
// Safari : le pincement passe aussi par des événements propriétaires, et le menu
// contextuel réapparaît malgré -webkit-touch-callout sur iOS 26.1 (bug ouvert
// forums Apple 808606). Ceinture et bretelles.
document.addEventListener('contextmenu', (e) => {
  if (/** @type {HTMLElement} */ (e.target).closest('.scroller')) e.preventDefault()
})
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
  const col = target.closest('.col')

  meter.arm()

  if (handle && block) {
    // les poignées sont des cibles explicites : pas d'appui long
    const id = /** @type {string} */ (/** @type {HTMLElement} */ (block).dataset.id)
    const ev = events.find((x) => x.id === id)
    if (!ev) return
    const edge = /** @type {HTMLElement} */ (handle).dataset.edge
    beginDrag(edge === 'start' ? 'resize-start' : 'resize-end', id, ev.window, e)
    return
  }

  press = {
    x: e.clientX,
    y: e.clientY,
    id: block ? /** @type {string} */ (/** @type {HTMLElement} */ (block).dataset.id) : null,
    edge: null,
    day: col ? Number(/** @type {HTMLElement} */ (col).dataset.day) : null,
  }
  pager = { startX: e.clientX, dx: 0, engaged: false }

  pressTimer = window.setTimeout(() => {
    if (!press) return
    if (press.id) {
      const ev = events.find((x) => x.id === press?.id)
      if (!ev) return
      selectedId = ev.id
      renderEvents()
      beginDrag('move', ev.id, ev.window, e)
      const el = blocks.get(ev.id)
      if (el) el.setAttribute('data-lift', '')
      vibrate(12)
    } else if (press.day !== null) {
      const col2 = columns[press.day]
      if (!col2) return
      const rect = col2.getBoundingClientRect()
      const start = slotAt(press.y - rect.top, slotH())
      const w = { day: press.day, startSlot: start, endSlot: Math.min(start + 2, SLOTS_PER_DAY) }
      ghost = document.createElement('div')
      ghost.className = 'ghost'
      ghost.style.top = `${w.startSlot * slotH()}px`
      ghost.style.height = `${(w.endSlot - w.startSlot) * slotH()}px`
      col2.appendChild(ghost)
      beginDrag('create', '', w, e)
      vibrate(12)
    }
  }, LONG_PRESS_MS)
}

/** @type {(kind: Drag['kind'], id: string, base: SlotWindow, e: PointerEvent) => void} */
function beginDrag(kind, id, base, e) {
  drag = { kind, id, base, startY: e.clientY, startX: e.clientX, scrollTop0: scroller.scrollTop, lastSlots: 0 }
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
      // le doigt a bougé avant 350 ms : c'est un défilement ou un changement de semaine
      window.clearTimeout(pressTimer)
      if (pager && !pager.engaged && Math.abs(dx) > PAGER_ENGAGE && Math.abs(dx) > Math.abs(dy) * 1.7) {
        pager.engaged = true
      }
    }
    if (pager?.engaged) {
      pager.dx = dx
      canvas.style.transform = `translateX(${dx * 0.6}px)`
      canvas.style.opacity = String(1 - Math.min(0.35, Math.abs(dx) / 400))
    }
    return
  }
  if (!drag) return

  autoScroll = edgeSpeed(e.clientY)
  const dy = e.clientY - drag.startY + (scroller.scrollTop - drag.scrollTop0)
  const slots = Math.round(dy / slotH())
  const day = dayAtX(e.clientX)

  if (slots !== drag.lastSlots) { drag.lastSlots = slots; vibrate(4) }

  if (drag.kind === 'move') {
    const w = moveWindow(drag.base, slots, day - drag.base.day)
    paintBlock(drag.id, w)
  } else if (drag.kind === 'resize-start') {
    paintBlock(drag.id, resizeStart(drag.base, slots))
  } else if (drag.kind === 'resize-end') {
    paintBlock(drag.id, resizeEnd(drag.base, slots))
  } else if (drag.kind === 'create' && ghost) {
    const col = columns[drag.base.day]
    if (!col) return
    const rect = col.getBoundingClientRect()
    const end = clamp(snapSlot(e.clientY - rect.top, slotH()), drag.base.startSlot + 1, SLOTS_PER_DAY)
    ghost.style.top = `${drag.base.startSlot * slotH()}px`
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
    if (Math.abs(dx) > PAGER_COMMIT) shiftWeek(dx < 0 ? 1 : -1)
    pager = null; press = null; meter.disarm()
    return
  }

  if (drag) {
    const d = drag
    drag = null
    if (d.kind === 'create' && ghost) {
      ghost.remove(); ghost = null
      const id = `n${Date.now()}`
      events = [...events, { id, title: 'Nouveau', kind: 'nous', window: d.base }]
      selectedId = id
    } else if (d.kind === 'move') {
      const day = dayAtX(e.clientX)
      commit(d.id, moveWindow(d.base, d.lastSlots, day - d.base.day))
    } else if (d.kind === 'resize-start') {
      commit(d.id, resizeStart(d.base, d.lastSlots))
    } else if (d.kind === 'resize-end') {
      commit(d.id, resizeEnd(d.base, d.lastSlots))
    }
    renderEvents()
    meter.disarm()
    press = null
    return
  }

  // simple tap : sélection ou désélection
  if (press) {
    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y) > MOVE_TOLERANCE
    if (!moved) { selectedId = press.id; renderEvents() }
  }
  press = null
  pager = null
  meter.disarm()
}

/** @type {(id: string, w: SlotWindow) => void} */
function commit(id, w) {
  events = events.map((e) => (e.id === id ? { ...e, window: w } : e))
}

/** @type {(id: string, w: SlotWindow) => void} */
function paintBlock(id, w) {
  const el = blocks.get(id)
  if (!el) return
  const h = slotH()
  const col = columns[w.day]
  if (col && el.parentElement !== col) col.appendChild(el)
  el.style.top = `${w.startSlot * h}px`
  el.style.height = `${(w.endSlot - w.startSlot) * h - 2}px`
  const r = el.querySelector('.r')
  if (r) r.textContent = formatRange(w)
}

/** @type {(x: number) => number} */
function dayAtX(x) {
  for (let i = columns.length - 1; i >= 0; i -= 1) {
    const col = columns[i]
    if (col && x >= col.getBoundingClientRect().left) return i
  }
  return 0
}

/* ---------------------- défilement automatique ---------------------- */

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

/* ------------------------------ pincement ------------------------------ */

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
  applySizes()
  renderEvents()
  const rect = scroller.getBoundingClientRect()
  // le créneau sous les doigts reste sous les doigts
  scroller.scrollTop = pinch.contentY * ratio - (pinch.focalY - rect.top)
}

/* ------------------------------ semaine ------------------------------ */

/** @type {(dir: number) => void} */
function shiftWeek(dir) {
  weekOffset += dir
  events = demoWeek(weekOffset)
  selectedId = null
  renderEvents()
  paintDates()
  const sub = document.getElementById('subtitle')
  if (sub) {
    const monday = mondayOf(weekOffset)
    sub.textContent = weekOffset === 0
      ? 'cette semaine'
      : monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  }
}

/* -------------------------------- init -------------------------------- */

export function mountWeek() {
  buildStatic()
  applySizes()
  renderEvents()
  applyFocus()
  const sub = document.getElementById('subtitle')
  if (sub) sub.textContent = 'cette semaine'
  requestAnimationFrame(revealWeek)
}

/** Pose le défilement sur 7 h à la première ouverture de l'onglet : un écran
 *  masqué n'a pas de hauteur, donc `scrollTop` n'y produit aucun effet. */
export function revealWeek() {
  if (scroller.scrollTop === 0) scroller.scrollTop = 7 * 2 * slotH() - 10
}
