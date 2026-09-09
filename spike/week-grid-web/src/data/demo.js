/* Données de démonstration — mêmes que le spike React Native, pour comparer
   les deux clients sur la même semaine. Couleurs réelles du couple. */

/** @typedef {import('../domain/time.js').SlotWindow} SlotWindow */
/** @typedef {'personal' | 'nous' | 'proposed'} EventKind */
/** @typedef {{ id: string, title: string, kind: EventKind, personColor?: string, window: SlotWindow }} DemoEvent */

const MIMI = '#c19a45'
const MIMINE = '#6f8bab'

/** @type {(offset: number) => DemoEvent[]} */
export function demoWeek(offset) {
  const shift = ((offset % 3) + 3) % 3
  /** @type {(day: number, start: number, end: number) => SlotWindow} */
  const w = (day, start, end) => ({ day: (day + shift) % 7, startSlot: start, endSlot: end })
  return [
    { id: 'e1', title: 'Dentiste', kind: 'personal', personColor: MIMI, window: w(0, 18, 20) },
    { id: 'e2', title: 'Sport', kind: 'personal', personColor: MIMINE, window: w(0, 36, 39) },
    { id: 'e3', title: 'Dîner chez Luigi', kind: 'nous', window: w(1, 40, 44) },
    { id: 'e4', title: 'Réunion', kind: 'personal', personColor: MIMI, window: w(2, 20, 22) },
    { id: 'e5', title: 'Appel maman', kind: 'personal', personColor: MIMINE, window: w(2, 21, 22) },
    { id: 'e6', title: 'Balade au parc ?', kind: 'proposed', window: w(3, 30, 34) },
    { id: 'e7', title: 'Marché', kind: 'nous', window: w(5, 18, 21) },
    { id: 'e8', title: 'Brunch', kind: 'nous', window: w(6, 22, 26) },
    { id: 'e9', title: 'Coiffeur', kind: 'personal', personColor: MIMI, window: w(3, 19, 21) },
    { id: 'e10', title: 'Yoga', kind: 'personal', personColor: MIMINE, window: w(4, 14, 16) },
    { id: 'e11', title: 'Ciné', kind: 'nous', window: w(4, 41, 45) },
    { id: 'e12', title: 'Lessive', kind: 'personal', personColor: MIMINE, window: w(1, 19, 20) },
    { id: 'e13', title: 'Point projet', kind: 'personal', personColor: MIMI, window: w(1, 19, 22) },
    { id: 'e14', title: 'Café', kind: 'personal', personColor: MIMI, window: w(1, 20, 21) },
    // de quoi juger une vraie journée : un matin, un midi, un soir, et un chevauchement
    { id: 'e15', title: 'Petit-déjeuner ensemble', kind: 'nous', window: w(0, 15, 17) },
    { id: 'e16', title: 'Déjeuner avec Léa', kind: 'personal', personColor: MIMI, window: w(0, 24, 26) },
    { id: 'e17', title: 'Livraison colis', kind: 'personal', personColor: MIMINE, window: w(0, 25, 27) },
    { id: 'e18', title: 'Courses', kind: 'nous', window: w(0, 34, 36) },
    { id: 'e19', title: 'Série ensemble', kind: 'nous', window: w(0, 42, 45) },
    { id: 'e20', title: 'Week-end à Rouen ?', kind: 'proposed', window: w(5, 20, 24) },
    { id: 'e21', title: 'Dîner chez mes parents', kind: 'nous', window: w(2, 39, 43) },
    { id: 'e22', title: 'Piscine', kind: 'personal', personColor: MIMINE, window: w(3, 15, 17) },
    { id: 'e23', title: 'Rendez-vous banque', kind: 'personal', personColor: MIMI, window: w(4, 21, 23) },
    { id: 'e24', title: 'Anniversaire de Tom', kind: 'nous', window: w(6, 38, 42) },
    // dans la nuit repliée : sans eux, la bande n'aurait jamais rien à annoncer
    { id: 'e25', title: 'Vol tôt', kind: 'nous', window: w(6, 10, 13) },
    { id: 'e26', title: 'Retour de soirée', kind: 'personal', personColor: MIMINE, window: w(5, 46, 48) },
  ]
}

export const DAY_LABELS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

/** @type {{ id: string, mine: boolean, text: string }[]} */
export const DEMO_MESSAGES = [
  { id: 'm1', mine: false, text: 'Tu as vu la proposition pour samedi ?' },
  { id: 'm2', mine: true, text: 'Oui ! Plutôt 20 h que 19 h, non ?' },
  { id: 'm3', mine: false, text: 'Va pour 20 h 🤍' },
  { id: 'm4', mine: true, text: 'Je réserve.' },
  { id: 'm5', mine: false, text: 'Et dimanche brunch ?' },
  { id: 'm6', mine: true, text: 'Évidemment.' },
]
