/* ------------------------------------------------------------------
   Modele de donnees.

   Tout est un "item" : { id, collection, ...champs }. Cette uniformite
   permet a l'adaptateur local et a l'adaptateur cloud de partager la
   meme interface, et de tout synchroniser via une seule table.
   ------------------------------------------------------------------ */

export type ID = string

/** Reference vers une image. `local:<id>` (IndexedDB) ou `cloud:<chemin>` (Supabase Storage). */
export type MediaRef = string

export interface BaseItem {
  id: ID
  createdAt: string
  updatedAt: string
  /** id de la personne qui a cree l'entree */
  authorId?: string
}

/* ------------------------------- Reglages ------------------------------- */

export interface Person {
  id: string
  name: string
  color: string
  photo?: MediaRef
  /** Le surnom qui sert d'identifiant de connexion. */
  login?: string
}

export interface Criterion {
  id: string
  label: string
  weight: number
}

export interface Settings extends BaseItem {
  siteName: string
  tagline: string
  /** Date de debut de la relation, format YYYY-MM-DD */
  startDate: string
  coverPhoto?: MediaRef
  people: Person[]
  theme: 'light' | 'dark' | 'auto'
  /** Ambiance colorimetrique du site */
  palette: PaletteName
  /** Criteres de notation des logements */
  criteria: Criterion[]
  /** Dates marquantes affichees sur l'accueil */
  milestones: { id: string; label: string; date: string }[]

  /** Identifiant du compte qui a configure le site (celui qui offre). */
  setupBy?: string
  /** Trace de la demande posee a la premiere connexion de l'autre. */
  proposal?: {
    answeredAt: string
    /** nombre de « non » avant le oui */
    refusals: number
    /** a-t-elle accepte de repeindre le site ? */
    choseColor: boolean
  }
}

export type PaletteName = 'automne' | 'bleu'

/* ------------------------------ Collections ------------------------------ */

export interface Adventure extends BaseItem {
  title: string
  date: string
  endDate?: string
  place: string
  lat?: number
  lng?: number
  description: string
  photos: MediaRef[]
  tags: string[]
  /** note sur 10 */
  rating: number
  favorite: boolean
}

export type WordKind = 'phrase' | 'joke' | 'nickname' | 'quote'

export interface Word extends BaseItem {
  text: string
  context: string
  /** id de la personne qui a dit la phrase */
  saidBy: string
  date: string
  kind: WordKind
  favorite: boolean
}

export interface Stay extends BaseItem {
  name: string
  place: string
  date: string
  nights?: number
  price?: number
  url?: string
  photos: MediaRef[]
  /** id du critere -> note sur 10 */
  scores: Record<string, number>
  comment: string
  wouldReturn: boolean
}

export type PlaceStatus = 'visited' | 'wishlist'

export interface Place extends BaseItem {
  name: string
  lat: number
  lng: number
  status: PlaceStatus
  date: string
  note: string
  photos: MediaRef[]
  country?: string
}

export interface BucketItem extends BaseItem {
  title: string
  note: string
  category: string
  done: boolean
  doneDate?: string
  targetDate?: string
  photos: MediaRef[]
}

export interface Photo extends BaseItem {
  media: MediaRef
  caption: string
  date: string
  album: string
  tags: string[]
  favorite: boolean
}

export interface Award extends BaseItem {
  category: string
  emoji: string
  winner: string
  year: string
  description: string
  photo?: MediaRef
}

export interface Capsule extends BaseItem {
  title: string
  message: string
  /** Date de deverrouillage, ISO */
  unlockAt: string
  fromId: string
  toId: string
  photos: MediaRef[]
  openedAt?: string
}

/* ------------------------------ Moodboard ------------------------------ */

export type MoodKind = 'stroke' | 'text' | 'note' | 'image' | 'sticker' | 'shape'

export interface MoodElement extends BaseItem {
  kind: MoodKind
  x: number
  y: number
  w: number
  h: number
  rotation: number
  z: number
  color: string
  /** texte pour text/note/sticker */
  text?: string
  fontSize?: number
  /** image */
  media?: MediaRef
  /** trace au stylet : suite de points [x,y,x,y,...] relatifs a x/y */
  points?: number[]
  strokeWidth?: number
  /** shape */
  shape?: 'rect' | 'ellipse' | 'heart'
}

/* ------------------------------- Base ------------------------------- */

export interface DB {
  settings: Settings[]
  adventures: Adventure[]
  words: Word[]
  stays: Stay[]
  places: Place[]
  bucket: BucketItem[]
  photos: Photo[]
  awards: Award[]
  capsules: Capsule[]
  moodboard: MoodElement[]
}

export type CollectionName = keyof DB

export const COLLECTIONS: CollectionName[] = [
  'settings',
  'adventures',
  'words',
  'stays',
  'places',
  'bucket',
  'photos',
  'awards',
  'capsules',
  'moodboard',
]

export const emptyDB = (): DB => ({
  settings: [],
  adventures: [],
  words: [],
  stays: [],
  places: [],
  bucket: [],
  photos: [],
  awards: [],
  capsules: [],
  moodboard: [],
})

/* ---------------------------- Valeurs par defaut ---------------------------- */

export const DEFAULT_CRITERIA: Criterion[] = [
  { id: 'comfort', label: 'Confort', weight: 1 },
  { id: 'deco', label: 'Déco', weight: 1 },
  { id: 'clean', label: 'Propreté', weight: 1 },
  { id: 'location', label: 'Emplacement', weight: 1 },
  { id: 'value', label: 'Rapport qualité/prix', weight: 1 },
  { id: 'view', label: 'Vue', weight: 0.5 },
  { id: 'kitchen', label: 'Cuisine', weight: 0.5 },
  { id: 'charm', label: 'Petit plus', weight: 0.5 },
]

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  createdAt: '',
  updatedAt: '',
  siteName: 'Nous',
  tagline: 'Notre petit espace à deux.',
  startDate: new Date().toISOString().slice(0, 10),
  people: [
    { id: 'p1', name: 'Toi', color: '#c4736e' },
    { id: 'p2', name: 'Moi', color: '#7d5f77' },
  ],
  theme: 'auto',
  palette: 'automne',
  criteria: DEFAULT_CRITERIA,
  milestones: [],
}
