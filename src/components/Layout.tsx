import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../data/store'
import { elapsedSince } from '../lib/date'
import { cx } from '../lib/utils'
import { Icon, type IconName } from './ui/Icon'
import { Modal } from './ui/Modal'
import { Avatar, Button } from './ui/primitives'
import './layout.css'

interface NavEntry {
  to: string
  label: string
  short: string
  icon: IconName
  /** cle de collection pour afficher un compteur */
  count?: 'adventures' | 'words' | 'stays' | 'places' | 'bucket' | 'photos' | 'awards' | 'capsules'
}

const SECTIONS: { title: string; items: NavEntry[] }[] = [
  {
    title: 'Nous',
    items: [
      { to: '/', label: 'Accueil', short: 'Accueil', icon: 'home' },
      { to: '/aventures', label: 'Nos aventures', short: 'Aventures', icon: 'book', count: 'adventures' },
      { to: '/mots', label: 'Nos mots', short: 'Mots', icon: 'quote', count: 'words' },
    ],
  },
  {
    title: 'Voyages',
    items: [
      { to: '/carte', label: 'Notre carte', short: 'Carte', icon: 'map', count: 'places' },
      { to: '/logements', label: 'Nos Airbnb', short: 'Airbnb', icon: 'house', count: 'stays' },
      { to: '/bucket-list', label: 'Bucket list', short: 'Bucket', icon: 'list', count: 'bucket' },
    ],
  },
  {
    title: 'Souvenirs',
    items: [
      { to: '/galerie', label: 'Galerie', short: 'Galerie', icon: 'gallery', count: 'photos' },
      { to: '/awards', label: 'Nos awards', short: 'Awards', icon: 'trophy', count: 'awards' },
      { to: '/capsules', label: 'Capsules', short: 'Capsules', icon: 'capsule', count: 'capsules' },
      { to: '/moodboard', label: 'Moodboard', short: 'Mood', icon: 'brush' },
    ],
  },
]

const ALL_ITEMS = SECTIONS.flatMap((s) => s.items)

/** Onglets visibles en bas sur mobile (le 5e ouvre le reste). */
const TAB_ROUTES = ['/', '/aventures', '/carte', '/galerie']

export function Layout() {
  const { settings, db, syncKind, syncState, me, ready } = useStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [whoOpen, setWhoOpen] = useState(false)

  const elapsed = elapsedSince(settings.startDate)
  const current = ALL_ITEMS.find((i) => i.to === location.pathname)
  const pageTitle = location.pathname === '/reglages' ? 'Réglages' : current?.label ?? settings.siteName

  const countOf = (key?: NavEntry['count']) => (key ? db[key].length : undefined)

  const syncLabel =
    syncKind === 'local'
      ? 'Sur cet appareil'
      : syncState === 'live'
        ? 'Synchronisé'
        : syncState === 'connecting'
          ? 'Connexion…'
          : syncState === 'error'
            ? 'Hors ligne'
            : 'Partagé'

  return (
    <div className="app">
      {/* ------------------------- Barre latérale (PC) ------------------------- */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__mark">
            <Icon name="heart-filled" size={19} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar__name">{settings.siteName}</div>
            <div className="sidebar__since">
              {elapsed.totalDays > 0 ? `${elapsed.totalDays.toLocaleString('fr-FR')} jours` : 'Jour 1'}
            </div>
          </div>
        </div>

        <nav className="nav">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="nav__section">{section.title}</div>
              {section.items.map((item) => (
                <NavItem key={item.to} item={item} count={countOf(item.count)} />
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__foot">
          <button className="me-badge" onClick={() => setWhoOpen(true)} type="button">
            {me ? (
              <>
                <Avatar person={me} size="sm" />
                <span className="truncate">{me.name}</span>
              </>
            ) : (
              <>
                <Icon name="heart" size={15} />
                <span>Qui es-tu ?</span>
              </>
            )}
          </button>

          <NavItem
            item={{ to: '/reglages', label: 'Réglages', short: 'Réglages', icon: 'settings' }}
          />

          <div className="sync" title={syncLabel}>
            <span
              className={cx(
                'sync__dot',
                syncKind === 'cloud' && syncState === 'live' && 'sync__dot--live',
                syncKind === 'cloud' && syncState === 'connecting' && 'sync__dot--connecting',
                syncKind === 'cloud' && (syncState === 'error' || syncState === 'offline') && 'sync__dot--error',
              )}
            />
            <span className="truncate">{syncLabel}</span>
          </div>
        </div>
      </aside>

      {/* ------------------------------ Contenu ------------------------------ */}
      <div className="main">
        <header className="topbar">
          <button
            type="button"
            onClick={() => setWhoOpen(true)}
            style={{ border: 'none', background: 'none', padding: 4, cursor: 'pointer', display: 'grid' }}
            aria-label="Qui es-tu ?"
          >
            {me ? <Avatar person={me} size="sm" /> : <Icon name="heart" size={19} />}
          </button>
          <div className="topbar__title">{pageTitle}</div>
          <button
            type="button"
            onClick={() => navigate('/reglages')}
            style={{ border: 'none', background: 'none', padding: 4, cursor: 'pointer', display: 'grid', color: 'var(--ink-2)' }}
            aria-label="Réglages"
          >
            <Icon name="settings" size={19} />
          </button>
        </header>

        <main className="content">
          {ready ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="center" style={{ minHeight: '50vh' }}>
              <motion.div
                animate={{ scale: [1, 1.14, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                style={{ color: 'var(--accent)' }}
              >
                <Icon name="heart-filled" size={34} />
              </motion.div>
            </div>
          )}
        </main>
      </div>

      {/* --------------------------- Onglets (mobile) --------------------------- */}
      <nav className="tabbar">
        <div className="tabbar__inner">
          {TAB_ROUTES.map((route) => {
            const item = ALL_ITEMS.find((i) => i.to === route)!
            const on = location.pathname === route
            return (
              <button
                key={route}
                type="button"
                className={cx('tabbar__item', on && 'tabbar__item--on')}
                onClick={() => navigate(route)}
              >
                <Icon name={item.icon} size={21} strokeWidth={on ? 1.9 : 1.6} />
                <span className="tabbar__label">{item.short}</span>
              </button>
            )
          })}
          <button
            type="button"
            className={cx(
              'tabbar__item',
              !TAB_ROUTES.includes(location.pathname) && 'tabbar__item--on',
            )}
            onClick={() => setSheetOpen(true)}
          >
            <Icon name="grid" size={21} />
            <span className="tabbar__label">Plus</span>
          </button>
        </div>
      </nav>

      {/* Feuille "toutes les sections" */}
      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} title="Nos sections">
        <div className="sheet-grid">
          {ALL_ITEMS.concat([
            { to: '/reglages', label: 'Réglages', short: 'Réglages', icon: 'settings' },
          ]).map((item) => (
            <button
              key={item.to}
              type="button"
              className={cx('sheet-item', location.pathname === item.to && 'sheet-item--on')}
              onClick={() => {
                navigate(item.to)
                setSheetOpen(false)
              }}
            >
              <Icon name={item.icon} size={22} strokeWidth={1.5} />
              {item.short}
            </button>
          ))}
        </div>
      </Modal>

      <WhoAmIModal open={whoOpen} onClose={() => setWhoOpen(false)} />
    </div>
  )
}

/* ------------------------------ Lien de nav ------------------------------ */

function NavItem({ item, count }: { item: NavEntry; count?: number }) {
  return (
    <NavLink to={item.to} className={({ isActive }) => cx('nav__item', isActive && 'nav__item--on')} end>
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-pill"
              className="nav__pill"
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            />
          )}
          <Icon name={item.icon} size={18} strokeWidth={isActive ? 1.9 : 1.6} />
          <span className="nav__label">{item.label}</span>
          {count !== undefined && count > 0 && <span className="nav__count">{count}</span>}
        </>
      )}
    </NavLink>
  )
}

/* ---------------------------- « Qui es-tu ? » ---------------------------- */

export function WhoAmIModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, me, setMe, authRequired, user, signOut } = useStore()

  return (
    <Modal open={open} onClose={onClose} title="Qui écrit ?" size="narrow">
      <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>
        On garde ça sur cet appareil, pour signer ce que tu ajoutes.
      </p>
      <div className="stack" style={{ gap: 10 }}>
        {settings.people.map((p) => (
          <button
            key={p.id}
            type="button"
            className="card card--pad card--hover"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-3)',
              cursor: 'pointer',
              borderColor: me?.id === p.id ? p.color : undefined,
              padding: 'var(--sp-3) var(--sp-4)',
            }}
            onClick={() => {
              setMe(p.id)
              onClose()
            }}
          >
            <Avatar person={p} />
            <span style={{ fontWeight: 500 }}>{p.name}</span>
            {me?.id === p.id && (
              <span style={{ marginLeft: 'auto', color: p.color, display: 'grid' }}>
                <Icon name="check" size={17} strokeWidth={2.4} />
              </span>
            )}
          </button>
        ))}
      </div>

      {authRequired && (
        <>
          <div className="divider" style={{ marginTop: 'var(--sp-4)' }}>
            Connexion
          </div>
          <div className="row" style={{ gap: 'var(--sp-3)', justifyContent: 'space-between' }}>
            <span className="dim truncate" style={{ fontSize: 'var(--t-xs)' }}>
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon="lock"
              onClick={() => {
                onClose()
                void signOut()
              }}
            >
              Se déconnecter
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
