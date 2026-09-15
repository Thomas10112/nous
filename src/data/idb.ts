/* ------------------------------------------------------------------
   Petit wrapper IndexedDB (aucune dependance).

   Deux magasins :
   - "items" : les donnees du site (cle = "collection:id")
   - "media" : les images en Blob (cle = id)

   IndexedDB plutot que localStorage : pas de limite a 5 Mo, et les
   Blobs sont stockes tels quels sans passer par du base64.
   ------------------------------------------------------------------ */

const DB_NAME = 'nous'
const DB_VERSION = 1

export const ITEMS = 'items'
export const MEDIA = 'media'

let dbPromise: Promise<IDBDatabase> | null = null

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error("IndexedDB n'est pas disponible dans ce navigateur."))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(ITEMS)) {
        const store = db.createObjectStore(ITEMS, { keyPath: 'key' })
        store.createIndex('collection', 'collection', { unique: false })
      }
      if (!db.objectStoreNames.contains(MEDIA)) {
        db.createObjectStore(MEDIA, { keyPath: 'id' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Ouverture IndexedDB impossible'))
  })

  return dbPromise
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode)
        const req = run(transaction.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const idbGetAll = <T>(store: string): Promise<T[]> =>
  tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>)

export const idbGet = <T>(store: string, key: string): Promise<T | undefined> =>
  tx<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>)

export const idbPut = <T>(store: string, value: T): Promise<unknown> =>
  tx(store, 'readwrite', (s) => s.put(value as unknown as never))

export const idbDelete = (store: string, key: string): Promise<unknown> =>
  tx(store, 'readwrite', (s) => s.delete(key))

export const idbClear = (store: string): Promise<unknown> =>
  tx(store, 'readwrite', (s) => s.clear())

/** Ecrit plusieurs valeurs dans une seule transaction. */
export async function idbPutMany<T>(store: string, values: T[]): Promise<void> {
  if (!values.length) return
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite')
    const s = transaction.objectStore(store)
    values.forEach((v) => s.put(v as unknown as never))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

/** Estimation de l'espace utilise, pour l'afficher dans les reglages. */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
  const e = await navigator.storage.estimate()
  return { usage: e.usage ?? 0, quota: e.quota ?? 0 }
}
