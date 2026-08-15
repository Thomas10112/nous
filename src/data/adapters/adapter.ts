/* ------------------------------------------------------------------
   Contrat commun a tous les adaptateurs de donnees.

   L'application ne connait QUE cette interface. On peut donc passer du
   stockage local au cloud (ou a autre chose plus tard : Firebase, une
   API maison...) sans toucher une seule page.
   ------------------------------------------------------------------ */

import type { CollectionName, DB, MediaRef } from '../types'

export type SyncState = 'idle' | 'connecting' | 'live' | 'offline' | 'error'

/* ---------------------------- Authentification ---------------------------- */

export interface AuthUser {
  id: string
  email: string
}

/**
 * Un adaptateur qui expose cette capacite exige une connexion avant de
 * donner acces aux donnees. L'adaptateur local ne l'implemente pas : sur
 * son propre appareil, on est deja chez soi.
 */
export interface AuthCapability {
  /** Session en cours au demarrage (null si personne n'est connecte). */
  current(): Promise<AuthUser | null>
  /** Previent a chaque connexion / deconnexion / rafraichissement. */
  onChange(handler: (user: AuthUser | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
}

export type ChangeEvent =
  | { type: 'upsert'; collection: CollectionName; item: Record<string, unknown> }
  | { type: 'delete'; collection: CollectionName; id: string }
  | { type: 'status'; state: SyncState; detail?: string }
  | { type: 'reload' }

export interface Adapter {
  /** 'local' = ce navigateur seulement · 'cloud' = partage entre appareils */
  readonly kind: 'local' | 'cloud'
  readonly label: string

  /** Present uniquement si l'adaptateur exige une connexion. */
  readonly auth?: AuthCapability

  init(): Promise<void>
  loadAll(): Promise<DB>

  put(collection: CollectionName, item: Record<string, unknown>): Promise<void>
  remove(collection: CollectionName, id: string): Promise<void>

  /** Notifie les changements venus d'ailleurs (autre onglet, autre appareil). */
  subscribe(handler: (event: ChangeEvent) => void): () => void

  uploadMedia(blob: Blob, filename: string): Promise<MediaRef>
  mediaURL(ref: MediaRef): Promise<string | null>
  deleteMedia(ref: MediaRef): Promise<void>

  dispose?(): void
}

/** Assemble une DB vide puis y range les items charges. */
export function groupIntoDB(rows: { collection: string; data: Record<string, unknown> }[]): DB {
  const db: Record<string, Record<string, unknown>[]> = {
    settings: [], adventures: [], words: [], stays: [], places: [],
    bucket: [], photos: [], awards: [], capsules: [], moodboard: [],
  }
  for (const row of rows) {
    if (db[row.collection]) db[row.collection].push(row.data)
  }
  return db as unknown as DB
}
