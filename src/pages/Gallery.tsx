/* ------------------------------------------------------------------
   Galerie.

   Elle rassemble les photos ajoutees ici ET celles des autres sections
   (aventures, logements, lieux, bucket list) : rien ne se perd, tout
   est visible au meme endroit.
   ------------------------------------------------------------------ */

import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useCollection, useStore } from '../data/store'
import type { MediaRef, Photo } from '../data/types'
import { Icon } from '../components/ui/Icon'
import { Button, Chip, Empty, PageHeader, Segmented } from '../components/ui/primitives'
import { FormModal, useConfirm } from '../components/ui/Modal'
import { DateInput, Field, Input, TagInput } from '../components/ui/form'
import { Img, useLightbox } from '../components/ui/Img'
import { pickFiles } from '../data/media'
import { formatMonthYear, todayISO } from '../lib/date'
import { matches, sortBy, uniq } from '../lib/utils'

interface Entry {
  key: string
  media: MediaRef
  caption: string
  date: string
  album: string
  favorite: boolean
  /** present seulement pour les photos gerees ici */
  photo?: Photo
  source: string
}

type Grouping = 'month' | 'album' | 'flat'

export default function Gallery() {
  const { items, create, update, remove } = useCollection('photos')
  const { db, uploadImage, notify } = useStore()
  const { confirm, node: confirmNode } = useConfirm()
  const lightbox = useLightbox()

  const [editing, setEditing] = useState<Photo | null>(null)
  const [draft, setDraft] = useState<Partial<Photo>>({})
  const [query, setQuery] = useState('')
  const [album, setAlbum] = useState<string | null>(null)
  const [grouping, setGrouping] = useState<Grouping>('month')
  const [favOnly, setFavOnly] = useState(false)
  const [uploading, setUploading] = useState(false)

  /* ----------------------- Toutes les photos du site ----------------------- */

  const entries = useMemo<Entry[]>(() => {
    const own: Entry[] = items.map((p) => ({
      key: p.id,
      media: p.media,
      caption: p.caption,
      date: p.date,
      album: p.album || 'Sans album',
      favorite: p.favorite,
      photo: p,
      source: 'Galerie',
    }))

    const fromAdventures: Entry[] = db.adventures.flatMap((a) =>
      a.photos.map((m, i) => ({
        key: `adv-${a.id}-${i}`,
        media: m,
        caption: a.title,
        date: a.date,
        album: 'Aventures',
        favorite: a.favorite,
        source: 'Aventure',
      })),
    )

    const fromStays: Entry[] = db.stays.flatMap((s) =>
      s.photos.map((m, i) => ({
        key: `stay-${s.id}-${i}`,
        media: m,
        caption: s.name,
        date: s.date,
        album: 'Logements',
        favorite: false,
        source: 'Airbnb',
      })),
    )

    const fromPlaces: Entry[] = db.places.flatMap((p) =>
      p.photos.map((m, i) => ({
        key: `place-${p.id}-${i}`,
        media: m,
        caption: p.name,
        date: p.date,
        album: 'Lieux',
        favorite: false,
        source: 'Carte',
      })),
    )

    const fromBucket: Entry[] = db.bucket.flatMap((b) =>
      b.photos.map((m, i) => ({
        key: `bucket-${b.id}-${i}`,
        media: m,
        caption: b.title,
        date: b.doneDate ?? b.createdAt.slice(0, 10),
        album: 'Bucket list',
        favorite: false,
        source: 'Bucket list',
      })),
    )

    return [...own, ...fromAdventures, ...fromStays, ...fromPlaces, ...fromBucket]
  }, [items, db.adventures, db.stays, db.places, db.bucket])

  const albums = useMemo(() => uniq(entries.map((e) => e.album)).sort(), [entries])

  const filtered = useMemo(() => {
    let out = entries
    if (query) out = out.filter((e) => matches(e.caption, query) || matches(e.album, query))
    if (album) out = out.filter((e) => e.album === album)
    if (favOnly) out = out.filter((e) => e.favorite)
    return sortBy(out, (e) => e.date ?? '', 'desc')
  }, [entries, query, album, favOnly])

  const groups = useMemo(() => {
    if (grouping === 'flat') return [['Toutes nos photos', filtered]] as [string, Entry[]][]

    const map = new Map<string, Entry[]>()
    filtered.forEach((e) => {
      const key = grouping === 'album' ? e.album : formatMonthYear(e.date) || 'Sans date'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    })
    return [...map.entries()]
  }, [filtered, grouping])

  /* ------------------------------- Actions ------------------------------- */

  const addPhotos = async () => {
    const files = await pickFiles(true)
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const media = await uploadImage(file)
        await create({
          media,
          caption: '',
          date: todayISO(),
          album: album && album !== 'Sans album' && items.some((p) => p.album === album) ? album : '',
          tags: [],
          favorite: false,
        })
      }
      notify(`${files.length} photo${files.length > 1 ? 's' : ''} ajoutée${files.length > 1 ? 's' : ''}`, 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Envoi impossible', 'error')
    } finally {
      setUploading(false)
    }
  }

  const del = async (p: Photo) => {
    const ok = await confirm({
      title: 'Supprimer cette photo ?',
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (ok) {
      await remove(p.id)
      setEditing(null)
    }
  }

  const save = async () => {
    if (!editing) return
    await update(editing.id, draft)
    setEditing(null)
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Tout est là"
        title="Notre galerie"
        subtitle={
          entries.length
            ? `${entries.length} photo${entries.length > 1 ? 's' : ''}, toutes sections confondues`
            : 'Les photos ajoutées partout ailleurs apparaîtront ici aussi.'
        }
        actions={
          <Button variant="primary" icon="plus" onClick={() => void addPhotos()} disabled={uploading}>
            {uploading ? 'Envoi…' : 'Ajouter des photos'}
          </Button>
        }
      />

      {entries.length > 0 && (
        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={16} />
            <Input value={query} onChange={setQuery} placeholder="Chercher une photo…" />
          </div>
          <Segmented
            value={grouping}
            onChange={setGrouping}
            options={[
              { value: 'month', label: 'Par mois', icon: 'calendar' },
              { value: 'album', label: 'Par album', icon: 'layers' },
              { value: 'flat', label: 'Tout', icon: 'grid' },
            ]}
          />
          <button
            className={`chip chip--button ${favOnly ? 'chip--on' : ''}`}
            onClick={() => setFavOnly((v) => !v)}
            type="button"
          >
            <Icon name={favOnly ? 'heart-filled' : 'heart'} size={12} />
            Favoris
          </button>
          {albums.length > 1 && (
            <div className="toolbar__scroll">
              {albums.map((a) => (
                <Chip key={a} onClick={() => setAlbum(album === a ? null : a)} active={album === a}>
                  {a}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty
          icon="gallery"
          title={entries.length ? 'Aucune photo' : 'Galerie vide'}
          text={
            entries.length
              ? 'Changez de filtre pour retrouver vos souvenirs.'
              : 'Déposez vos plus belles images — celles qui n’ont pas besoin de légende.'
          }
          action={
            !entries.length && (
              <Button variant="primary" icon="plus" onClick={() => void addPhotos()}>
                Ajouter des photos
              </Button>
            )
          }
        />
      ) : (
        <div>
          {groups.map(([label, list]) => (
            <section key={label} className="gallery__album">
              {grouping !== 'flat' && (
                <div className="gallery__album-title">
                  <h2 style={{ textTransform: 'capitalize' }}>{label}</h2>
                  <span className="dim" style={{ fontSize: 'var(--t-xs)' }}>
                    {list.length} photo{list.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              <div className="gallery">
                <AnimatePresence mode="popLayout">
                  {list.map((e, i) => (
                    <motion.button
                      key={e.key}
                      layout
                      className="gallery__cell"
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94 }}
                      transition={{ delay: Math.min(i * 0.015, 0.3), duration: 0.3 }}
                      onClick={() =>
                        lightbox.open(
                          list.map((x) => ({ media: x.media, caption: x.caption })),
                          i,
                        )
                      }
                    >
                      <Img media={e.media} alt={e.caption} />

                      {e.favorite && (
                        <span className="gallery__fav">
                          <Icon name="heart-filled" size={15} />
                        </span>
                      )}

                      <span className="gallery__overlay">
                        <span>
                          {e.caption || <em style={{ opacity: 0.7 }}>Sans titre</em>}
                          {e.source !== 'Galerie' && (
                            <span style={{ display: 'block', opacity: 0.65, fontSize: 10, marginTop: 2 }}>
                              {e.source}
                            </span>
                          )}
                        </span>
                      </span>

                      {e.photo && (
                        <span
                          className="card__action"
                          onClick={(ev) => {
                            ev.stopPropagation()
                            setDraft({ ...e.photo })
                            setEditing(e.photo!)
                          }}
                          style={{ position: 'absolute', top: 8, left: 8 }}
                        >
                          <Icon name="edit" size={13} />
                        </span>
                      )}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => void addPhotos()} aria-label="Ajouter des photos">
        <Icon name="plus" size={24} />
      </button>

      <FormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Cette photo"
        onSubmit={save}
        onDelete={editing ? () => void del(editing) : undefined}
      >
        {editing && (
          <div
            style={{
              borderRadius: 'var(--r-md)',
              overflow: 'hidden',
              aspectRatio: '16/10',
              background: 'var(--surface-3)',
            }}
          >
            <Img media={editing.media} alt="" />
          </div>
        )}

        <Field label="Légende">
          <Input
            value={draft.caption ?? ''}
            onChange={(v) => setDraft({ ...draft, caption: v })}
            placeholder="Le matin où il a neigé"
          />
        </Field>

        <div className="form-grid">
          <Field label="Date">
            <DateInput
              value={draft.date ?? todayISO()}
              onChange={(v) => setDraft({ ...draft, date: v })}
            />
          </Field>
          <Field label="Album">
            <Input
              value={draft.album ?? ''}
              onChange={(v) => setDraft({ ...draft, album: v })}
              placeholder="Été 2025"
              list="album-list"
            />
            <datalist id="album-list">
              {albums.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field label="Étiquettes">
          <TagInput
            value={draft.tags ?? []}
            onChange={(v) => setDraft({ ...draft, tags: v })}
            placeholder="Entrée pour valider"
          />
        </Field>

        <button
          type="button"
          className={`chip chip--button ${draft.favorite ? 'chip--on' : ''}`}
          onClick={() => setDraft({ ...draft, favorite: !draft.favorite })}
          style={{ height: 36, alignSelf: 'flex-start' }}
        >
          <Icon name={draft.favorite ? 'heart-filled' : 'heart'} size={13} />
          Favorite
        </button>
      </FormModal>

      {confirmNode}
      {lightbox.node}
    </div>
  )
}
