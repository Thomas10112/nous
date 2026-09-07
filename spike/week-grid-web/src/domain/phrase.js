/* ------------------------------------------------------------------
   La phrase du jour.

   Idée retenue par le jury de conception : le bandeau dit le rythme d'une
   journée, mais il ne répond pas à la question qu'on se pose vraiment en
   ouvrant l'app — « est-ce qu'on est libres ce soir ? ». Une phrase courte y
   répond en une lecture, là où il faudrait sinon interpréter des marques.

   Logique pure : une liste de créneaux entre, une phrase française sort.
   ------------------------------------------------------------------ */

import { SLOTS_PER_DAY, formatSlot } from './time.js'

/** @typedef {import('./time.js').SlotWindow} SlotWindow */

/** Journée visible : 7 h → 23 h, comme la page et le bandeau. */
export const DAY_START = 14
export const DAY_END = 46

/** Un « vrai » creux commence à trois heures, soit six créneaux. */
const GAP_MIN = 6

/**
 * @param {readonly SlotWindow[]} windows créneaux du jour, dans n'importe quel ordre
 * @returns {string} une ligne, jamais deux, toujours vraie
 */
export function phraseOfDay(windows) {
  const w = [...windows]
    .filter((x) => x.endSlot > x.startSlot)
    .sort((a, b) => a.startSlot - b.startSlot)
  if (w.length === 0) return 'la journée est à vous'

  const first = /** @type {SlotWindow} */ (w[0]).startSlot
  const last = w.reduce((m, x) => Math.max(m, x.endSlot), 0)

  // Tout se passe tard : ce qui compte est l'heure à laquelle ça commence.
  if (first >= 34) return `rien avant ${formatSlot(first)}`
  // Tout se passe tôt : ce qui compte est l'heure à laquelle on se libère.
  if (last <= 26) return `libre à partir de ${formatSlot(last)}`

  // Sinon, le plus utile est le plus grand creux de la journée.
  let gapStart = -1
  let gapEnd = -1
  let cursor = Math.max(first, DAY_START)
  for (const x of w) {
    if (x.startSlot - cursor > gapEnd - gapStart) {
      gapStart = cursor
      gapEnd = x.startSlot
    }
    cursor = Math.max(cursor, x.endSlot)
  }
  if (gapEnd - gapStart >= GAP_MIN && gapEnd < Math.min(last, DAY_END)) {
    return `libre de ${formatSlot(gapStart)} à ${formatSlot(gapEnd)}`
  }

  return `pris de ${formatSlot(first)} à ${formatSlot(Math.min(last, SLOTS_PER_DAY))}`
}

/**
 * Poids d'encre du chiffre dans le bandeau : la charge d'un jour se dit par
 * l'encre, pas par une jauge (une jauge, c'est un tableau de bord).
 * @param {number} count
 * @returns {'vide' | 'leger' | 'charge'}
 */
export function inkWeight(count) {
  if (count === 0) return 'vide'
  if (count <= 2) return 'leger'
  return 'charge'
}
