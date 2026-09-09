/* ------------------------------------------------------------------
   Temps en créneaux de 30 minutes — logique pure.

   Dans le spike, ces fonctions portent la directive 'worklet' pour être
   appelables depuis le thread UI (elles vivent dans le périmètre Babel de
   l'app). Dans le vrai projet, elles vivront dans packages/domain et seront
   dupliquées en worklets avec un test d'égalité (06 §3.3).
   ------------------------------------------------------------------ */

export const SLOT_MIN = 30
export const SLOTS_PER_DAY = 48
export const DAYS_PER_WEEK = 7

/** Fenêtre d'un item dans la semaine : jour 0..6, créneaux 0..48 (fin exclue). */
export interface SlotWindow {
  day: number
  startSlot: number
  endSlot: number
}

export function clamp(v: number, min: number, max: number): number {
  'worklet'
  return Math.min(max, Math.max(min, v))
}

/** Créneau le plus proche d'une ordonnée (px) pour une hauteur de créneau donnée. */
export function snapSlot(y: number, slotHeight: number): number {
  'worklet'
  return clamp(Math.round(y / slotHeight), 0, SLOTS_PER_DAY)
}

/** Créneau contenant l'ordonnée (arrondi vers le bas). */
export function slotAt(y: number, slotHeight: number): number {
  'worklet'
  return clamp(Math.floor(y / slotHeight), 0, SLOTS_PER_DAY - 1)
}

export function moveWindow(w: SlotWindow, deltaSlots: number, deltaDays: number): SlotWindow {
  'worklet'
  const length = w.endSlot - w.startSlot
  const startSlot = clamp(w.startSlot + deltaSlots, 0, SLOTS_PER_DAY - length)
  return {
    day: clamp(w.day + deltaDays, 0, DAYS_PER_WEEK - 1),
    startSlot,
    endSlot: startSlot + length,
  }
}

export function resizeStart(w: SlotWindow, deltaSlots: number, minSlots = 1): SlotWindow {
  'worklet'
  return { ...w, startSlot: clamp(w.startSlot + deltaSlots, 0, w.endSlot - minSlots) }
}

export function resizeEnd(w: SlotWindow, deltaSlots: number, minSlots = 1): SlotWindow {
  'worklet'
  return { ...w, endSlot: clamp(w.endSlot + deltaSlots, w.startSlot + minSlots, SLOTS_PER_DAY) }
}

/** « 9 h », « 9 h 30 », « 14 h » — jamais « 09:30 ». */
export function formatSlot(slot: number): string {
  'worklet'
  const h = Math.floor(slot / 2)
  return slot % 2 === 1 ? `${h} h 30` : `${h} h`
}

/** « de 9 h 30 à 11 h ». */
export function formatRange(w: SlotWindow): string {
  'worklet'
  return `de ${formatSlot(w.startSlot)} à ${formatSlot(w.endSlot)}`
}

/** Index de colonne pour une abscisse, à partir des bords gauches des colonnes. */
export function dayAt(x: number, lefts: number[], widths: number[]): number {
  'worklet'
  for (let i = lefts.length - 1; i >= 0; i -= 1) {
    if (x >= lefts[i]) return clamp(i, 0, widths.length - 1)
  }
  return 0
}

/* ------------------------------------------------------------------
   La nuit repliée.

   Parti pris n°5 du design system : « 7 h → 23 h par défaut, la nuit repliée
   en une bande dépliable ». Une journée ouverte sur dix heures de vide est une
   journée qu'on referme.

   L'échelle n'est donc plus linéaire : les créneaux de la journée gardent leur
   hauteur, ceux de la nuit se compriment dans une bande de hauteur fixe. Tout
   ce qui convertit un créneau en pixels — un bloc, la gouttière, la ligne
   « maintenant », un glissé — doit passer par ici, sous peine d'afficher une
   fausse heure.
   ------------------------------------------------------------------ */

/** 7 h : fin de la bande du matin, début de la journée montrée. */
export const NIGHT_END = 14
/** 23 h : début de la bande du soir. */
export const NIGHT_START = 46

export interface DayScale {
  /** hauteur d'un créneau de 30 min dans la plage montrée */
  slotH: number
  /** hauteur d'une bande de nuit repliée */
  bandH: number
  /** false = les 24 heures à l'échelle, l'échelle redevient linéaire */
  folded: boolean
}

/** Ordonnée du haut d'un créneau. */
export function slotToY(slot: number, s: DayScale): number {
  'worklet'
  if (!s.folded) return slot * s.slotH
  if (slot <= NIGHT_END) return (slot / NIGHT_END) * s.bandH
  const dayBottom = s.bandH + (NIGHT_START - NIGHT_END) * s.slotH
  if (slot <= NIGHT_START) return s.bandH + (slot - NIGHT_END) * s.slotH
  return dayBottom + ((slot - NIGHT_START) / (SLOTS_PER_DAY - NIGHT_START)) * s.bandH
}

/** Créneau (fractionnaire) à une ordonnée — l'inverse exact de `slotToY`. */
export function yToSlot(y: number, s: DayScale): number {
  'worklet'
  if (!s.folded) return y / s.slotH
  const dayTop = s.bandH
  const dayBottom = s.bandH + (NIGHT_START - NIGHT_END) * s.slotH
  if (y <= dayTop) return (y / s.bandH) * NIGHT_END
  if (y >= dayBottom) return NIGHT_START + ((y - dayBottom) / s.bandH) * (SLOTS_PER_DAY - NIGHT_START)
  return NIGHT_END + (y - dayTop) / s.slotH
}

/** Hauteur totale du canevas d'une journée. */
export function dayHeight(s: DayScale): number {
  'worklet'
  return s.folded ? 2 * s.bandH + (NIGHT_START - NIGHT_END) * s.slotH : SLOTS_PER_DAY * s.slotH
}

/** Créneau le plus proche d'une ordonnée, échelle comprise. */
export function snapSlotAt(y: number, s: DayScale): number {
  'worklet'
  return clamp(Math.round(yToSlot(y, s)), 0, SLOTS_PER_DAY)
}

/** Créneau contenant l'ordonnée, échelle comprise. */
export function slotAtY(y: number, s: DayScale): number {
  'worklet'
  return clamp(Math.floor(yToSlot(y, s)), 0, SLOTS_PER_DAY - 1)
}
