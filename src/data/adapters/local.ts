/* ------------------------------------------------------------------
   Adaptateur LOCAL : tout reste dans ce navigateur (IndexedDB).

   - Aucun compte, aucun serveur, ca marche hors ligne.
   - Les onglets ouverts sur le meme appareil se synchronisent entre eux
     grace a BroadcastChannel.
   - Limite assumee : les donnees ne sortent pas de l'appareil. Pour
     ecrire a deux depuis plusieurs appareils, voir l'adaptateur cloud.
   ------------------------------------------------------------------ */

import type { CollectionName, DB, MediaRef } from '../types'
import { ITEMS, MEDIA, idbDelete, idbGet, idbGetAll, idbPut } from '../idb'
import { uid } from '../../lib/utils'
import type { Adapter, ChangeEvent } from './adapter'

interface ItemRow {
  key: string
  collection: string
  data: Record<string, unknown>
}

interface MediaRow {
  id: string
  blob: Blob
  type: string
  name: string
  createdAt: string
}

const CHANNEL = 'nous-sync'

export class LocalAdapter implements Adapter {
  readonly kind = 'local' as const
  readonly label = 'Cet appareil'

  private channel: BroadcastChannel | null = null
  private handlers = new Set<(e: ChangeEvent) => void>()
  private urlCache = new Map<string, string>()

  async init(): Promise<void> {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL)
      this.channel.onmessage = (ev) => {
        const e = ev.data as ChangeEvent
        this.handlers.forEach((h) => h(e))
      }
    }
  }

  async loadAll(): Promise<DB> {
    const rows = await idbGetAll<ItemRow>(ITEMS)
    const db: Record<string, Record<string, unknown>[]> = {
      settings: [], adventures: [], words: [], stays: [], places: [],
      bucket: [], photos: [], awards: [], capsules: [], moodboard: [],
    }
    for (const row of rows) {
      if (db[row.collection]) db[row.collection].push(row.data)
    }
    return db as unknown as DB
  }

  async put(collection: CollectionName, item: Record<string, unknown>): Promise<void> {
    const id = String(item.id)
    await idbPut<ItemRow>(ITEMS, { key: `${collection}:${id}`, collection, data: item })
    this.broadcast({ type: 'upsert', collection, item })
  }

  async remove(collection: CollectionName, id: string): Promise<void> {
    await idbDelete(ITEMS, `${collection}:${id}`)
    this.broadcast({ type: 'delete', collection, id })
  }

  subscribe(handler: (event: ChangeEvent) => void): () => void {
    this.handlers.add(handler)
    // Le mode local est immediatement "pret".
    handler({ type: 'status', state: 'idle' })
    return () => this.handlers.delete(handler)
  }

  async uploadMedia(blob: Blob, filename: string): Promise<MediaRef> {
    const id = uid()
    await idbPut<MediaRow>(MEDIA, {
      id,
      blob,
      type: blob.type || 'image/jpeg',
      name: filename,
      createdAt: new Date().toISOString(),
    })
    return `local:${id}`
  }

  async mediaURL(ref: MediaRef): Promise<string | null> {
    if (!ref) return null
    if (ref.startsWith('data:') || ref.startsWith('http')) return ref
    if (!ref.startsWith('local:')) return null

    const cached = this.urlCache.get(ref)
    if (cached) return cached

    const row = await idbGet<MediaRow>(MEDIA, ref.slice(6))
    if (!row?.blob) return null

    const url = URL.createObjectURL(row.blob)
    this.urlCache.set(ref, url)
    return url
  }

  async deleteMedia(ref: MediaRef): Promise<void> {
    if (!ref?.startsWith('local:')) return
    const url = this.urlCache.get(ref)
    if (url) {
      URL.revokeObjectURL(url)
      this.urlCache.delete(ref)
    }
    await idbDelete(MEDIA, ref.slice(6))
  }

  /** Recupere le Blob brut : sert a migrer les photos locales vers le cloud. */
  async getBlob(ref: MediaRef): Promise<{ blob: Blob; name: string } | null> {
    if (!ref?.startsWith('local:')) return null
    const row = await idbGet<MediaRow>(MEDIA, ref.slice(6))
    return row?.blob ? { blob: row.blob, name: row.name } : null
  }

  async listMediaRefs(): Promise<string[]> {
    const rows = await idbGetAll<MediaRow>(MEDIA)
    return rows.map((r) => `local:${r.id}`)
  }

  private broadcast(e: ChangeEvent) {
    try {
      this.channel?.postMessage(e)
    } catch {
      /* onglet en cours de fermeture : sans importance */
    }
  }

  dispose(): void {
    this.channel?.close()
    this.urlCache.forEach((url) => URL.revokeObjectURL(url))
    this.urlCache.clear()
    this.handlers.clear()
  }
}
