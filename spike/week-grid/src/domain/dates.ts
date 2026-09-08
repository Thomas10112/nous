/* Dates de la semaine affichée — logique pure, thread JS uniquement.
   Le spike travaille en « offset de semaine » relatif à la semaine en cours ;
   le vrai projet passera par des dates ISO locales (03 §2). */

/** Lundi de la semaine décalée de `offset` semaines, à minuit. */
export function mondayOf(offset: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Date du jour `index` (0 = lundi) de la semaine décalée de `offset`. */
export function dateOf(offset: number, index: number): Date {
  const d = mondayOf(offset)
  d.setDate(d.getDate() + index)
  return d
}

export function isToday(d: Date): boolean {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return d.getTime() === t.getTime()
}

/** Index du jour d'aujourd'hui dans sa semaine, lundi = 0. */
export const todayIndex = (): number => (new Date().getDay() + 6) % 7

/* Noms français en dur : Hermes n'embarque pas toujours l'ICU complet sur
   Android, et l'app est monolingue. Deux tableaux valent mieux qu'un doute. */
const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
] as const
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const

/** « septembre 2026 ». */
export const monthLabel = (d: Date): string => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`

/** « mardi 8 septembre ». */
export const longDate = (d: Date): string =>
  `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
