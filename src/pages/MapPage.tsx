/* ------------------------------------------------------------------
   Carte de nos lieux.

   Leaflet est pilote directement (sans react-leaflet) : moins de
   dependances, et un controle total sur les marqueurs.
   Fond de carte CARTO (gratuit) + geocodage Nominatim (gratuit).
   ------------------------------------------------------------------ */

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCollection, useStore } from '../data/store'
import type { Place, PlaceStatus } from '../data/types'
import { Icon } from '../components/ui/Icon'
import { Button, Chip, Empty, PageHeader, Segmented, Stat } from '../components/ui/primitives'
import { FormModal, useConfirm } from '../components/ui/Modal'
import { DateInput, Field, Input, Select, Textarea } from '../components/ui/form'
import { PhotoInput, Img, useLightbox } from '../components/ui/Img'
import { formatDateShort, todayISO } from '../lib/date'
import { debounce, matches, sortBy } from '../lib/utils'

const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
}
const ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

const COLORS: Record<PlaceStatus, string> = {
  visited: '#c4736e',
  wishlist: '#6f8bab',
}

const makeIcon = (status: PlaceStatus) =>
  L.divIcon({
    className: 'pin-wrap',
    html: `<div class="pin ${status === 'wishlist' ? 'pin--wish' : ''}"><div class="pin__shape" style="background:${
      status === 'wishlist' ? 'transparent' : COLORS.visited
    };border-color:${status === 'wishlist' ? COLORS.wishlist : '#fff'}"></div></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 27],
    popupAnchor: [0, -26],
  })

interface GeoResult {
  name: string
  lat: number
  lng: number
}

export default function MapPage() {
  const { items, create, update, remove } = useCollection('places')
  const { settings, notify } = useStore()
  const { confirm, node: confirmNode } = useConfirm()
  const lightbox = useLightbox()

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const didFit = useRef(false)

  const blank = (lat = 46.6, lng = 2.4): Omit<Place, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: '',
    lat,
    lng,
    status: 'wishlist',
    date: todayISO(),
    note: '',
    photos: [],
  })

  const [editing, setEditing] = useState<Place | 'new' | null>(null)
  const [draft, setDraft] = useState(blank)
  const [filter, setFilter] = useState<PlaceStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [geoResults, setGeoResults] = useState<GeoResult[]>([])
  const [geoBusy, setGeoBusy] = useState(false)
  const [addMode, setAddMode] = useState(false)

  const visible = useMemo(() => {
    let out = items
    if (filter !== 'all') out = out.filter((p) => p.status === filter)
    if (query) out = out.filter((p) => matches(p.name, query) || matches(p.note, query))
    return sortBy(out, (p) => p.date ?? '', 'desc')
  }, [items, filter, query])

  /* ------------------------------ Création de la carte ------------------------------ */

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [46.6, 2.4],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    })
    mapRef.current = map

    const dark = document.documentElement.getAttribute('data-theme') === 'dark'
    tileRef.current = L.tileLayer(dark ? TILES.dark : TILES.light, {
      attribution: ATTRIB,
      maxZoom: 19,
    }).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
      tileRef.current = null
    }
  }, [])

  /* --------------------------- Fond clair / sombre --------------------------- */

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark'
      tileRef.current?.setUrl(dark ? TILES.dark : TILES.light)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  /* ------------------------------ Clic = nouveau lieu ------------------------------ */

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const onClick = (e: L.LeafletMouseEvent) => {
      if (!addMode) return
      setDraft(blank(e.latlng.lat, e.latlng.lng))
      setEditing('new')
      setAddMode(false)
    }

    map.on('click', onClick)
    if (containerRef.current) {
      containerRef.current.style.cursor = addMode ? 'crosshair' : ''
    }
    return () => {
      map.off('click', onClick)
    }
  }, [addMode])

  /* --------------------------------- Marqueurs --------------------------------- */

  useEffect(() => {
    const layer = layerRef.current
    const map = mapRef.current
    if (!layer || !map) return

    layer.clearLayers()

    visible.forEach((p) => {
      const marker = L.marker([p.lat, p.lng], { icon: makeIcon(p.status), title: p.name })
      const safe = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))
      marker.bindPopup(
        `<strong style="font-family:var(--font-display);font-size:15px">${safe(p.name)}</strong>` +
          (p.note ? `<br/><span style="color:var(--ink-2);font-size:13px">${safe(p.note)}</span>` : '') +
          `<br/><span style="color:var(--ink-3);font-size:11px">${
            p.status === 'visited' ? 'Déjà vu' : 'À découvrir'
          }${p.date && p.status === 'visited' ? ' · ' + formatDateShort(p.date) : ''}</span>`,
      )
      marker.on('dblclick', () => {
        setDraft({ ...p })
        setEditing(p)
      })
      layer.addLayer(marker)
    })

    // Premier rendu : on cadre sur l'ensemble des lieux.
    if (!didFit.current && visible.length > 0) {
      didFit.current = true
      const bounds = L.latLngBounds(visible.map((p) => [p.lat, p.lng] as [number, number]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 })
    }
  }, [visible])

  /* -------------------------------- Géocodage -------------------------------- */

  const search = useMemo(
    () =>
      debounce(async (q: string) => {
        if (q.trim().length < 3) {
          setGeoResults([])
          return
        }
        setGeoBusy(true)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=fr&q=${encodeURIComponent(q)}`,
            { headers: { Accept: 'application/json' } },
          )
          const data = (await res.json()) as { display_name: string; lat: string; lon: string }[]
          setGeoResults(
            data.map((d) => ({ name: d.display_name, lat: Number(d.lat), lng: Number(d.lon) })),
          )
        } catch {
          setGeoResults([])
        } finally {
          setGeoBusy(false)
        }
      }, 500),
    [],
  )

  const flyTo = useCallback((lat: number, lng: number, zoom = 12) => {
    mapRef.current?.flyTo([lat, lng], zoom, { duration: 0.9 })
  }, [])

  /* -------------------------------- Actions -------------------------------- */

  const save = async () => {
    if (!draft.name.trim()) return
    if (editing === 'new') await create(draft)
    else if (editing) await update(editing.id, draft)
    setEditing(null)
    flyTo(draft.lat, draft.lng)
  }

  const del = async (p: Place) => {
    const ok = await confirm({
      title: 'Retirer ce lieu ?',
      message: `« ${p.name} » disparaîtra de la carte.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (ok) {
      await remove(p.id)
      setEditing(null)
    }
  }

  const visited = items.filter((p) => p.status === 'visited').length
  const wished = items.length - visited

  return (
    <div className="page">
      <PageHeader
        eyebrow="Nos coordonnées"
        title="Notre carte"
        subtitle="Là où on est allés, et là où on ira."
        actions={
          <>
            <Button
              variant={addMode ? 'primary' : 'default'}
              icon="pin"
              onClick={() => setAddMode((v) => !v)}
            >
              {addMode ? 'Cliquez sur la carte' : 'Placer un point'}
            </Button>
            <Button
              variant="primary"
              icon="plus"
              onClick={() => {
                const c = mapRef.current?.getCenter()
                setDraft(blank(c?.lat, c?.lng))
                setEditing('new')
              }}
            >
              Ajouter
            </Button>
          </>
        }
      />

      <div className="stats">
        <Stat value={visited} label={visited > 1 ? 'lieux visités' : 'lieu visité'} />
        <Stat value={wished} label="à découvrir" />
        <Stat
          value={new Set(items.filter((p) => p.country).map((p) => p.country)).size || '—'}
          label="pays"
        />
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={16} />
          <Input value={query} onChange={setQuery} placeholder="Chercher dans nos lieux…" />
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tout' },
            { value: 'visited', label: 'Visités', icon: 'heart-filled' },
            { value: 'wishlist', label: 'À découvrir', icon: 'target' },
          ]}
        />
      </div>

      <div className="map-layout">
        <div className="map-shell">
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
          <div className="map-shell__hint">
            <Icon name={addMode ? 'target' : 'pin'} size={13} />
            {addMode ? 'Cliquez pour poser le point' : 'Double-clic sur un point pour le modifier'}
          </div>
        </div>

        <div className="map-side">
          {visible.length === 0 ? (
            <Empty
              icon="map"
              title={items.length ? 'Aucun lieu' : 'Carte vierge'}
              text={
                items.length
                  ? 'Changez de filtre.'
                  : 'Ajoutez le premier endroit — celui du premier rendez-vous, par exemple.'
              }
            />
          ) : (
            visible.map((p) => (
              <motion.button
                key={p.id}
                layout
                className="place-row"
                onClick={() => flyTo(p.lat, p.lng)}
                onDoubleClick={() => {
                  setDraft({ ...p })
                  setEditing(p)
                }}
              >
                <span className="place-row__dot" style={{ background: COLORS[p.status] }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="place-row__name">{p.name}</span>
                  <span className="place-row__meta" style={{ display: 'block' }}>
                    {p.status === 'visited' ? formatDateShort(p.date) || 'Visité' : 'À découvrir'}
                    {p.photos.length > 0 && ` · ${p.photos.length} photo${p.photos.length > 1 ? 's' : ''}`}
                  </span>
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    setDraft({ ...p })
                    setEditing(p)
                  }}
                  style={{ color: 'var(--ink-3)', display: 'grid', padding: 4 }}
                >
                  <Icon name="edit" size={14} />
                </span>
              </motion.button>
            ))
          )}
        </div>
      </div>

      <button
        className="fab"
        onClick={() => {
          const c = mapRef.current?.getCenter()
          setDraft(blank(c?.lat, c?.lng))
          setEditing('new')
        }}
        aria-label="Ajouter un lieu"
      >
        <Icon name="plus" size={24} />
      </button>

      {/* -------------------------------- Formulaire -------------------------------- */}
      <FormModal
        open={editing !== null}
        onClose={() => {
          setEditing(null)
          setGeoResults([])
        }}
        title={editing === 'new' ? 'Nouveau lieu' : 'Modifier le lieu'}
        onSubmit={save}
        canSubmit={!!draft.name.trim()}
        onDelete={editing && editing !== 'new' ? () => void del(editing) : undefined}
      >
        <Field label="Chercher une adresse" hint="Remplit les coordonnées automatiquement.">
          <div className="search" style={{ width: '100%' }}>
            <Icon name="search" size={16} />
            <input
              className="input"
              placeholder="Lisbonne, Chamonix, 12 rue…"
              onChange={(e) => search(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>
        </Field>

        <AnimatePresence>
          {(geoBusy || geoResults.length > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="stack" style={{ gap: 4 }}>
                {geoBusy && <span className="dim" style={{ fontSize: 'var(--t-xs)' }}>Recherche…</span>}
                {geoResults.map((r) => (
                  <button
                    key={`${r.lat}-${r.lng}`}
                    type="button"
                    className="place-row"
                    onClick={() => {
                      setDraft({
                        ...draft,
                        lat: r.lat,
                        lng: r.lng,
                        name: draft.name || r.name.split(',')[0],
                        country: r.name.split(',').pop()?.trim(),
                      })
                      setGeoResults([])
                      flyTo(r.lat, r.lng)
                    }}
                  >
                    <Icon name="pin" size={14} />
                    <span className="place-row__name" style={{ whiteSpace: 'normal' }}>
                      {r.name}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Field label="Le nom">
          <Input
            value={draft.name}
            onChange={(v) => setDraft({ ...draft, name: v })}
            placeholder="La calanque secrète"
            autoFocus
          />
        </Field>

        <div className="form-grid">
          <Field label="Statut">
            <Select
              value={draft.status}
              onChange={(v) => setDraft({ ...draft, status: v })}
              options={[
                { value: 'visited', label: '🤍  On y est allés' },
                { value: 'wishlist', label: '🎯  À découvrir' },
              ]}
            />
          </Field>
          <Field label="Date">
            <DateInput value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
          </Field>
          <Field label="Latitude">
            <Input
              value={String(draft.lat)}
              onChange={(v) => setDraft({ ...draft, lat: Number(v) || 0 })}
            />
          </Field>
          <Field label="Longitude">
            <Input
              value={String(draft.lng)}
              onChange={(v) => setDraft({ ...draft, lng: Number(v) || 0 })}
            />
          </Field>
        </div>

        <Field label="Un mot">
          <Textarea
            value={draft.note}
            onChange={(v) => setDraft({ ...draft, note: v })}
            placeholder="L'eau était glacée, on y retourne l'été prochain."
            rows={3}
          />
        </Field>

        <PhotoInput
          label="Photos"
          value={draft.photos}
          onChange={(v) => setDraft({ ...draft, photos: v })}
          max={8}
        />
      </FormModal>

      {confirmNode}
      {lightbox.node}
    </div>
  )
}
