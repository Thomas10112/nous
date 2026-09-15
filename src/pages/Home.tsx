import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCollection, useStore } from '../data/store'
import { Icon } from '../components/ui/Icon'
import { Button, Chip, Stat } from '../components/ui/primitives'
import { Img, useLightbox } from '../components/ui/Img'
import { elapsedSince, formatDate, formatDateShort, nextAnniversary, nextMilestoneDays, pad2 } from '../lib/date'
import { sortBy } from '../lib/utils'
import { SettingsModal } from '../components/SettingsModal'

export default function Home() {
  const { settings, db } = useStore()
  const [tick, setTick] = useState(() => new Date())
  const [editing, setEditing] = useState(false)
  const lightbox = useLightbox()

  // Une seule horloge pour toute la page.
  useEffect(() => {
    const id = setInterval(() => setTick(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const elapsed = elapsedSince(settings.startDate, tick)
  const anniversary = nextAnniversary(settings.startDate, tick)
  const milestone = nextMilestoneDays(elapsed.totalDays)

  const [nameA, nameB] = settings.people.map((p) => p.name)

  /* ------------------------------ Derniers contenus ------------------------------ */

  const lastAdventures = useMemo(
    () => sortBy(db.adventures, (a) => a.date, 'desc').slice(0, 3),
    [db.adventures],
  )

  const favouriteWord = useMemo(() => {
    const favs = db.words.filter((w) => w.favorite)
    const pool = favs.length ? favs : db.words
    if (!pool.length) return null
    // Une citation differente chaque jour, mais stable dans la journee.
    const seed = Math.floor(tick.getTime() / 86400000)
    return pool[seed % pool.length]
  }, [db.words, tick])

  const recentPhotos = useMemo(() => {
    const fromGallery = db.photos.map((p) => ({ media: p.media, caption: p.caption, date: p.date }))
    const fromAdventures = db.adventures.flatMap((a) =>
      a.photos.map((m) => ({ media: m, caption: a.title, date: a.date })),
    )
    return sortBy([...fromGallery, ...fromAdventures], (p) => p.date ?? '', 'desc').slice(0, 9)
  }, [db.photos, db.adventures])

  const nextCapsule = useMemo(() => {
    const locked = db.capsules
      .filter((c) => new Date(c.unlockAt).getTime() > tick.getTime())
      .sort((a, b) => new Date(a.unlockAt).getTime() - new Date(b.unlockAt).getTime())
    return locked[0] ?? null
  }, [db.capsules, tick])

  const readyCapsules = db.capsules.filter(
    (c) => new Date(c.unlockAt).getTime() <= tick.getTime() && !c.openedAt,
  ).length

  const bucketDone = db.bucket.filter((b) => b.done).length
  const visited = db.places.filter((p) => p.status === 'visited').length

  const totalPhotos =
    db.photos.length +
    db.adventures.reduce((n, a) => n + a.photos.length, 0) +
    db.stays.reduce((n, s) => n + s.photos.length, 0)

  const hasCover = !!settings.coverPhoto

  return (
    <div className="page">
      {/* --------------------------------- Héros --------------------------------- */}
      <motion.section
        className={`hero ${hasCover ? '' : 'hero--empty'}`}
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      >
        {hasCover && (
          <div className="hero__bg">
            <Img media={settings.coverPhoto} alt="" />
          </div>
        )}
        <div className="hero__veil" />

        <div className="hero__edit">
          <button
            className="card__action"
            onClick={() => setEditing(true)}
            aria-label="Personnaliser l'accueil"
            style={hasCover ? { background: 'rgba(255,255,255,.16)', color: '#fff', borderColor: 'rgba(255,255,255,.28)' } : undefined}
          >
            <Icon name="edit" size={15} />
          </button>
        </div>

        <div className="hero__content">
          <motion.h1
            className="hero__names"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.55 }}
          >
            {nameA}
            <span className="hero__amp">&</span>
            {nameB}
          </motion.h1>

          {settings.tagline && (
            <motion.p
              className="hero__tagline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28, duration: 0.6 }}
            >
              {settings.tagline}
            </motion.p>
          )}

          <motion.div
            className="counter"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36, duration: 0.5 }}
          >
            {elapsed.years > 0 && <CounterCell num={elapsed.years} unit={elapsed.years > 1 ? 'ans' : 'an'} />}
            {(elapsed.years > 0 || elapsed.months > 0) && (
              <CounterCell num={elapsed.months} unit="mois" />
            )}
            <CounterCell num={elapsed.days} unit={elapsed.days > 1 ? 'jours' : 'jour'} />
            <CounterCell num={elapsed.totalDays} unit="jours en tout" wide />
          </motion.div>

          <div className="counter__clock">
            <Icon name="heart-filled" size={12} />
            <span>
              soit {(elapsed.totalDays * 24 + tick.getHours()).toLocaleString('fr-FR')} h{' '}
              {pad2(tick.getMinutes())} min {pad2(tick.getSeconds())} s
            </span>
          </div>
        </div>
      </motion.section>

      {/* -------------------------------- Statistiques -------------------------------- */}
      <div className="stats">
        <Stat value={db.adventures.length} label="aventures" />
        <Stat value={visited} label={visited > 1 ? 'lieux visités' : 'lieu visité'} />
        <Stat value={totalPhotos} label="photos" />
        <Stat value={db.words.length} label="petits mots" />
        <Stat value={`${bucketDone}/${db.bucket.length}`} label="bucket list" />
      </div>

      {/* ------------------------------- Deux colonnes ------------------------------- */}
      <div className="home-grid">
        <div className="stack" style={{ gap: 'var(--sp-5)' }}>
          {/* Dernières aventures */}
          <section className="panel">
            <div className="panel__head">
              <div className="panel__title">
                <Icon name="book" size={17} />
                Nos dernières aventures
              </div>
              <Link to="/aventures" className="panel__link">
                Tout voir <Icon name="chevron-right" size={12} />
              </Link>
            </div>

            {lastAdventures.length === 0 ? (
              <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>
                Rien encore. La première histoire vous attend.{' '}
                <Link to="/aventures" style={{ color: 'var(--accent)' }}>
                  En ajouter une →
                </Link>
              </p>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {lastAdventures.map((a) => (
                  <Link
                    key={a.id}
                    to="/aventures"
                    className="place-row"
                    style={{ gap: 'var(--sp-4)' }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 'var(--r-sm)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'var(--surface-3)',
                      }}
                    >
                      <Img media={a.photos[0]} alt="" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="place-row__name">{a.title}</div>
                      <div className="place-row__meta">
                        {formatDateShort(a.date)}
                        {a.place && ` · ${a.place}`}
                      </div>
                    </div>
                    <Icon name="chevron-right" size={15} />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Souvenirs en mosaïque */}
          {recentPhotos.length > 0 && (
            <section className="panel">
              <div className="panel__head">
                <div className="panel__title">
                  <Icon name="gallery" size={17} />
                  Souvenirs récents
                </div>
                <Link to="/galerie" className="panel__link">
                  La galerie <Icon name="chevron-right" size={12} />
                </Link>
              </div>
              <div className="mosaic">
                {recentPhotos.map((p, i) => (
                  <div
                    key={`${p.media}-${i}`}
                    className="mosaic__cell"
                    onClick={() =>
                      lightbox.open(
                        recentPhotos.map((x) => ({ media: x.media, caption: x.caption })),
                        i,
                      )
                    }
                  >
                    <Img media={p.media} alt={p.caption ?? ''} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="stack" style={{ gap: 'var(--sp-5)' }}>
          {/* Prochaine date */}
          {anniversary && (
            <div className="upnext">
              <div>
                <div className="upnext__num">{anniversary.inDays}</div>
                <div style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-3)' }}>
                  {anniversary.inDays > 1 ? 'jours' : 'jour'}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>
                  {anniversary.inDays === 0
                    ? "C'est aujourd'hui 🤍"
                    : `Vos ${anniversary.years} ${anniversary.years > 1 ? 'ans' : 'an'}`}
                </div>
                <div style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-2)' }}>
                  {formatDate(anniversary.date)}
                </div>
                <div style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-3)', marginTop: 4 }}>
                  Et {milestone.inDays} {milestone.inDays > 1 ? 'jours' : 'jour'} avant vos{' '}
                  {milestone.at.toLocaleString('fr-FR')} jours
                </div>
              </div>
            </div>
          )}

          {/* Citation du jour */}
          {favouriteWord && (
            <section className="panel">
              <div className="panel__head">
                <div className="panel__title">
                  <Icon name="quote" size={17} />
                  Ce jour-là on a dit
                </div>
                <Link to="/mots" className="panel__link">
                  Nos mots <Icon name="chevron-right" size={12} />
                </Link>
              </div>
              <p className="pullquote">{favouriteWord.text}</p>
              <div className="row" style={{ gap: 8, fontSize: 'var(--t-xs)', color: 'var(--ink-3)' }}>
                <Icon name="heart" size={12} />
                {settings.people.find((p) => p.id === favouriteWord.saidBy)?.name ?? 'Nous'}
                {favouriteWord.date && ` · ${formatDateShort(favouriteWord.date)}`}
              </div>
            </section>
          )}

          {/* Capsules */}
          {(nextCapsule || readyCapsules > 0) && (
            <section className="panel">
              <div className="panel__head">
                <div className="panel__title">
                  <Icon name="capsule" size={17} />
                  Capsules
                </div>
                <Link to="/capsules" className="panel__link">
                  Voir <Icon name="chevron-right" size={12} />
                </Link>
              </div>

              {readyCapsules > 0 ? (
                <Link to="/capsules">
                  <Chip tone="gold">
                    <Icon name="unlock" size={12} />
                    {readyCapsules} capsule{readyCapsules > 1 ? 's' : ''} à ouvrir
                  </Chip>
                </Link>
              ) : nextCapsule ? (
                <div>
                  <div style={{ fontSize: 'var(--t-sm)', fontWeight: 500 }}>{nextCapsule.title}</div>
                  <div style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-3)', marginTop: 3 }}>
                    S'ouvre le {formatDate(nextCapsule.unlockAt)}
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {/* Bucket list */}
          {db.bucket.length > 0 && (
            <section className="panel">
              <div className="panel__head">
                <div className="panel__title">
                  <Icon name="list" size={17} />
                  Bucket list
                </div>
                <Link to="/bucket-list" className="panel__link">
                  Voir <Icon name="chevron-right" size={12} />
                </Link>
              </div>
              <div className="progress">
                <div
                  className="progress__fill"
                  style={{ width: `${Math.round((bucketDone / db.bucket.length) * 100)}%` }}
                />
              </div>
              <div style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-3)' }}>
                {bucketDone} sur {db.bucket.length} — encore {db.bucket.length - bucketDone} à faire
                ensemble
              </div>
            </section>
          )}

          {/* Raccourcis */}
          <section className="panel">
            <div className="panel__title" style={{ marginBottom: 4 }}>
              <Icon name="sparkle" size={17} />
              Ajouter vite fait
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              <Link to="/aventures">
                <Button size="sm" icon="book">Une aventure</Button>
              </Link>
              <Link to="/mots">
                <Button size="sm" icon="quote">Une phrase</Button>
              </Link>
              <Link to="/galerie">
                <Button size="sm" icon="image">Des photos</Button>
              </Link>
              <Link to="/moodboard">
                <Button size="sm" icon="brush">Le moodboard</Button>
              </Link>
            </div>
          </section>
        </div>
      </div>

      <SettingsModal open={editing} onClose={() => setEditing(false)} />
      {lightbox.node}
    </div>
  )
}

function CounterCell({ num, unit, wide }: { num: number; unit: string; wide?: boolean }) {
  return (
    <div className="counter__cell" style={wide ? { minWidth: 96 } : undefined}>
      <div className="counter__num">{num.toLocaleString('fr-FR')}</div>
      <div className="counter__unit">{unit}</div>
    </div>
  )
}
