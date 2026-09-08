import { Suspense, lazy, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Toasts } from './components/ui/Modal'
import { Onboarding } from './pages/Onboarding'
import { useStore } from './data/store'
import { Icon } from './components/ui/Icon'

// Chaque page arrive à la demande : la carte n'embarque Leaflet que
// lorsqu'on l'ouvre vraiment. Ça compte sur un téléphone en 4G.
import Home from './pages/Home'
const Rendezvous = lazy(() => import('./pages/Rendezvous'))
const Journal = lazy(() => import('./pages/Journal'))
const Words = lazy(() => import('./pages/Words'))
const Stays = lazy(() => import('./pages/Stays'))
const MapPage = lazy(() => import('./pages/MapPage'))
const Bucket = lazy(() => import('./pages/Bucket'))
const Gallery = lazy(() => import('./pages/Gallery'))
const Awards = lazy(() => import('./pages/Awards'))
const Capsules = lazy(() => import('./pages/Capsules'))
const Moodboard = lazy(() => import('./pages/Moodboard'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const Login = lazy(() => import('./pages/Login'))
const Proposal = lazy(() => import('./pages/Proposal'))

function PageLoader() {
  return (
    <div className="center" style={{ minHeight: '46vh', color: 'var(--accent)', opacity: 0.6 }}>
      <Icon name="heart-filled" size={26} />
    </div>
  )
}

/**
 * Le chargement a échoué. On le dit clairement, et surtout on ne fait
 * PAS comme si le compte était vierge : vos données sont intactes côté
 * serveur, c'est l'accès qui a raté.
 */
function LoadErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  const [retrying, setRetrying] = useState(false)

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--sp-5)',
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 420 }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto var(--sp-4)',
            background: 'var(--surface-3)',
            color: 'var(--ink-3)',
          }}
        >
          <Icon name="cloud" size={26} />
        </div>

        <h1 style={{ fontSize: 'var(--t-lg)' }}>Impossible de charger vos souvenirs</h1>

        <p className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 'var(--sp-3)', lineHeight: 1.7 }}>
          Rien n'est perdu — ils sont bien à leur place, c'est la connexion qui n'a pas
          abouti. Vérifiez votre réseau et réessayez.
        </p>

        <p className="dim" style={{ fontSize: 'var(--t-xs)', marginTop: 'var(--sp-3)' }}>
          {message}
        </p>

        <button
          type="button"
          className="btn btn--primary"
          style={{ marginTop: 'var(--sp-5)' }}
          disabled={retrying}
          onClick={() => {
            setRetrying(true)
            onRetry()
            setTimeout(() => setRetrying(false), 1500)
          }}
        >
          {retrying ? 'Nouvelle tentative…' : 'Réessayer'}
        </button>
      </motion.div>
    </div>
  )
}

/** Écran neutre pendant qu'on vérifie la session. */
function BootScreen() {
  return (
    <div className="center" style={{ minHeight: '100dvh', color: 'var(--accent)' }}>
      <motion.div
        animate={{ scale: [1, 1.14, 1] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
      >
        <Icon name="heart-filled" size={30} />
      </motion.div>
    </div>
  )
}

export default function App() {
  const { toasts, dismissToast, db, ready, me, authRequired, authChecked, user, settings, loadError, reload } =
    useStore()

  // La demande ne se joue qu'à la première connexion de la personne qui
  // n'a PAS configuré le site. On fige la décision au premier passage :
  // sinon l'enregistrement de la réponse démonterait l'écran en plein
  // milieu de son animation de sortie.
  const [showProposal, setShowProposal] = useState<boolean | null>(null)

  useEffect(() => {
    if (showProposal !== null) return
    if (!ready || !authRequired || !user || !db.settings[0]) return
    setShowProposal(
      !!settings.setupBy && user.id !== settings.setupBy && !settings.proposal?.answeredAt,
    )
  }, [showProposal, ready, authRequired, user, db.settings, settings])

  // Ordre des portes : connexion → chargement → configuration → site.
  const needsLogin = authRequired && authChecked && !user

  // Premier lancement : on demande les prénoms et la date.
  // Si les réglages existent déjà (l'autre a configuré le site), on demande
  // seulement « qui es-tu ? ».
  const needsSetup = ready && !needsLogin && !db.settings[0]
  const needsIdentity = ready && !needsLogin && !!db.settings[0] && !me

  // Tant qu'on ne sait pas s'il y a une session, on n'affiche rien de
  // définitif : sinon l'écran de connexion clignote à chaque ouverture.
  if (authRequired && !authChecked) {
    return (
      <>
        <BootScreen />
        <Toasts toasts={toasts} onDismiss={dismissToast} />
      </>
    )
  }

  if (needsLogin) {
    return (
      <>
        <Suspense fallback={<BootScreen />}>
          <Login />
        </Suspense>
        <Toasts toasts={toasts} onDismiss={dismissToast} />
      </>
    )
  }

  // Chargement raté ET rien en mémoire : surtout NE PAS enchaîner sur
  // l'assistant de premier lancement. Le valider écraserait les vrais
  // réglages du couple, et le temps réel propagerait la casse.
  if (loadError && !db.settings[0]) {
    return (
      <>
        <LoadErrorScreen message={loadError} onRetry={() => void reload()} />
        <Toasts toasts={toasts} onDismiss={dismissToast} />
      </>
    )
  }

  return (
    <>
      {needsSetup || needsIdentity ? (
        <Onboarding mode={needsSetup ? 'full' : 'identity'} />
      ) : (
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="/rendez-vous" element={<Rendezvous />} />
              <Route path="/aventures" element={<Journal />} />
              <Route path="/mots" element={<Words />} />
              <Route path="/logements" element={<Stays />} />
              <Route path="/carte" element={<MapPage />} />
              <Route path="/bucket-list" element={<Bucket />} />
              <Route path="/galerie" element={<Gallery />} />
              <Route path="/awards" element={<Awards />} />
              <Route path="/capsules" element={<Capsules />} />
              <Route path="/moodboard" element={<Moodboard />} />
              <Route path="/reglages" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      )}

      <AnimatePresence>
        {showProposal && (
          <Suspense fallback={null}>
            <Proposal onDone={() => setShowProposal(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}
