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

/* ------------------------------------------------------------------
   La nuit repliée — même échelle que le client React Native.

   Parti pris n°5 du design system : « 7 h → 23 h par défaut, la nuit repliée
   en une bande dépliable ». L'échelle créneau → pixel cesse donc d'être
   linéaire, et TOUT ce qui convertit doit passer par ici.
   ------------------------------------------------------------------ */

/** 7 h : fin de la bande du matin. */
export const NIGHT_END = 14
/** 23 h : début de la bande du soir. */
export const NIGHT_START = 46

/** @typedef {{ slotH: number, bandH: number, folded: boolean }} DayScale */

/** @type {(slot: number, s: DayScale) => number} */
export function slotToY(slot, s) {
  if (!s.folded) return slot * s.slotH
  if (slot <= NIGHT_END) return (slot / NIGHT_END) * s.bandH
  const dayBottom = s.bandH + (NIGHT_START - NIGHT_END) * s.slotH
  if (slot <= NIGHT_START) return s.bandH + (slot - NIGHT_END) * s.slotH
  return dayBottom + ((slot - NIGHT_START) / (SLOTS_PER_DAY - NIGHT_START)) * s.bandH
}

/** @type {(y: number, s: DayScale) => number} */
export function yToSlot(y, s) {
  if (!s.folded) return y / s.slotH
  const dayTop = s.bandH
  const dayBottom = s.bandH + (NIGHT_START - NIGHT_END) * s.slotH
  if (y <= dayTop) return (y / s.bandH) * NIGHT_END
  if (y >= dayBottom) return NIGHT_START + ((y - dayBottom) / s.bandH) * (SLOTS_PER_DAY - NIGHT_START)
  return NIGHT_END + (y - dayTop) / s.slotH
}

/** @type {(s: DayScale) => number} */
export function dayHeight(s) {
  return s.folded ? 2 * s.bandH + (NIGHT_START - NIGHT_END) * s.slotH : SLOTS_PER_DAY * s.slotH
}

/** @type {(y: number, s: DayScale) => number} */
export function snapSlotAt(y, s) {
  return clamp(Math.round(yToSlot(y, s)), 0, SLOTS_PER_DAY)
}

/** @type {(y: number, s: DayScale) => number} */
export function slotAtY(y, s) {
  return clamp(Math.floor(yToSlot(y, s)), 0, SLOTS_PER_DAY - 1)
}
