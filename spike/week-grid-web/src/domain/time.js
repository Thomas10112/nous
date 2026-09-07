/* Temps en créneaux de 30 minutes — logique pure, portée telle quelle depuis
   spike/week-grid/src/domain/time.ts (sans les directives 'worklet', inutiles
   sur le web). Dans le vrai projet, ce fichier est packages/domain et sert aux
   deux clients. */

export const SLOT_MIN = 30
export const SLOTS_PER_DAY = 48
export const DAYS_PER_WEEK = 7

/**
 * @typedef {{ day: number, startSlot: number, endSlot: number }} SlotWindow
 * Fenêtre d'un item dans la semaine : jour 0..6, créneaux 0..48 (fin exclue).
 */

/** @type {(v: number, min: number, max: number) => number} */
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/** Créneau le plus proche d'une ordonnée (px). @type {(y: number, slotHeight: number) => number} */
export const snapSlot = (y, slotHeight) => clamp(Math.round(y / slotHeight), 0, SLOTS_PER_DAY)

/** Créneau contenant l'ordonnée (arrondi vers le bas). @type {(y: number, slotHeight: number) => number} */
export const slotAt = (y, slotHeight) => clamp(Math.floor(y / slotHeight), 0, SLOTS_PER_DAY - 1)

/** @type {(w: SlotWindow, deltaSlots: number, deltaDays: number) => SlotWindow} */
export function moveWindow(w, deltaSlots, deltaDays) {
  const length = w.endSlot - w.startSlot
  const startSlot = clamp(w.startSlot + deltaSlots, 0, SLOTS_PER_DAY - length)
  return {
    day: clamp(w.day + deltaDays, 0, DAYS_PER_WEEK - 1),
    startSlot,
    endSlot: startSlot + length,
  }
}

/** @type {(w: SlotWindow, deltaSlots: number, minSlots?: number) => SlotWindow} */
export function resizeStart(w, deltaSlots, minSlots = 1) {
  return { ...w, startSlot: clamp(w.startSlot + deltaSlots, 0, w.endSlot - minSlots) }
}

/** @type {(w: SlotWindow, deltaSlots: number, minSlots?: number) => SlotWindow} */
export function resizeEnd(w, deltaSlots, minSlots = 1) {
  return { ...w, endSlot: clamp(w.endSlot + deltaSlots, w.startSlot + minSlots, SLOTS_PER_DAY) }
}

/** « 9 h », « 9 h 30 » — jamais « 09:30 ». @type {(slot: number) => string} */
export function formatSlot(slot) {
  const h = Math.floor(slot / 2)
  return slot % 2 === 1 ? `${h} h 30` : `${h} h`
}

/** « de 9 h 30 à 11 h ». @type {(w: SlotWindow) => string} */
export const formatRange = (w) => `de ${formatSlot(w.startSlot)} à ${formatSlot(w.endSlot)}`
