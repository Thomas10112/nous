/* ------------------------------------------------------------------
   La demande.

   Ne se joue qu'une fois, a la premiere connexion de la personne qui
   n'a pas configure le site. La reponse est enregistree dans les
   reglages : elle ne se rejouera pas sur un autre appareil.
   ------------------------------------------------------------------ */

import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../data/store'
import { Icon } from '../components/ui/Icon'
import { nowISO } from '../lib/utils'
import './proposal.css'

type Step = 'ask1' | 'ask2' | 'ask3' | 'unlock' | 'color' | 'wash'

/** Nombre d'esquives avant que le bouton « Non » ne s'évapore. */
const MAX_DODGES = 7

export default function Proposal({
  onDone,
  preview = false,
}: {
  onDone: () => void
  /** Mode aperçu : rien n'est enregistré, la palette est rendue puis rendue. */
  preview?: boolean
}) {
  const { settings, saveSettings } = useStore()

  const [step, setStep] = useState<Step>('ask1')
  const [refusals, setRefusals] = useState(0)
  const [progress, setProgress] = useState(0)

  /* --------------------------- Bouton fuyard --------------------------- */

  const [dodges, setDodges] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const zoneRef = useRef<HTMLDivElement>(null)

  const dodge = useCallback(() => {
    const zone = zoneRef.current
    if (!zone) return
    const w = zone.clientWidth
    const h = Math.max(zone.clientHeight, 120)

    // On saute quelque part d'assez loin pour être injoignable, mais
    // toujours à l'intérieur du cadre.
    const rx = (Math.random() - 0.5) * Math.max(w - 140, 120)
    const ry = (Math.random() - 0.5) * Math.max(h - 60, 80)
    const loin = Math.hypot(rx - offset.x, ry - offset.y) > 70
    setOffset(loin ? { x: rx, y: ry } : { x: -rx, y: -ry })
    setDodges((d) => d + 1)
  }, [offset])

  const evapore = dodges >= MAX_DODGES

  // Rien ne doit défiler derrière : c'est le seul écran qui compte.
  useEffect(() => {
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = precedent
    }
  }, [])

  /* ------------------------------ Réponses ------------------------------ */

  const direNon = () => {
    setRefusals((r) => r + 1)
    if (step === 'ask1') setStep('ask2')
    else if (step === 'ask2') setStep('ask3')
    // À l'étape 3, le bouton « Non » ne répond plus : il fuit.
  }

  const direOui = () => setStep('unlock')

  /* ------------------------ Barre de déverrouillage ------------------------ */

  useEffect(() => {
    if (step !== 'unlock') return
    setProgress(0)

    const duree = 2400
    const debut = Date.now()
    let raf = 0
    let fini = false

    const avancer = () => {
      if (fini) return
      const p = Math.min(1, (Date.now() - debut) / duree)
      // Une petite hésitation vers 70 % : ça a l'air plus vrai.
      const eased = p < 0.7 ? p * 1.05 : 0.735 + (p - 0.7) * 0.883
      setProgress(Math.min(100, Math.round(eased * 100)))
      if (p < 1) raf = requestAnimationFrame(avancer)
      else terminerBarre()
    }

    const terminerBarre = () => {
      if (fini) return
      fini = true
      setProgress(100)
      suite = setTimeout(() => setStep('color'), 550)
    }

    // Filet de sécurité : si l'onglet part en arrière-plan,
    // requestAnimationFrame se fige. On ne laisse jamais la barre coincée.
    const filet = setTimeout(terminerBarre, duree + 1500)
    let suite: ReturnType<typeof setTimeout> | undefined

    raf = requestAnimationFrame(avancer)

    return () => {
      fini = true
      cancelAnimationFrame(raf)
      clearTimeout(filet)
      if (suite) clearTimeout(suite)
    }
  }, [step])

  /* ------------------------------ Sortie ------------------------------ */

  const terminer = async (choseColor: boolean) => {
    if (!choseColor) {
      if (!preview) await saveSettings({ proposal: { answeredAt: nowISO(), refusals, choseColor: false } })
      onDone()
      return
    }

    setStep('wash')

    if (preview) {
      // Aperçu : on repeint l'écran sans toucher aux réglages, et on
      // remettra tout en place au démontage.
      const root = document.documentElement
      root.classList.add('palette-switching')
      root.setAttribute('data-palette', 'bleu')
      setTimeout(() => root.classList.remove('palette-switching'), 1300)
    } else {
      await saveSettings({
        palette: 'bleu',
        proposal: { answeredAt: nowISO(), refusals, choseColor: true },
      })
    }

    // On laisse le fondu de palette se dérouler avant de rendre la main.
    setTimeout(onDone, 1900)
  }

  // En aperçu, on restaure la palette réelle en repartant.
  useEffect(() => {
    if (!preview) return
    return () => {
      const root = document.documentElement
      root.classList.add('palette-switching')
      root.setAttribute('data-palette', settings.palette ?? 'automne')
      setTimeout(() => root.classList.remove('palette-switching'), 1300)
    }
  }, [preview, settings.palette])

  /* ------------------------------- Rendu ------------------------------- */

  const question =
    step === 'ask1'
      ? 'Veux-tu sortir avec moi ?'
      : step === 'ask2'
        ? 'QUOI ? TU VEUX PAS ?\nT’ES SÛRE ?'
        : 'BON. DERNIÈRE CHANCE.'

  const pose = step === 'ask1' || step === 'ask2' || step === 'ask3'

  /* Le contenu de l'étape courante, en un seul bloc : c'est le `key` du
     conteneur qui déclenche l'animation d'arrivée à chaque changement. */
  const contenu = () => {
    if (pose) {
      return (
        <>
          <motion.div
            animate={step === 'ask2' ? { rotate: [0, -2.5, 2.5, -1.5, 0] } : {}}
            transition={{ duration: 0.55 }}
          >
            <h1
              className={`prop__question ${step !== 'ask1' ? 'prop__question--shout' : ''}`}
              style={{ whiteSpace: 'pre-line' }}
            >
              {question}
            </h1>
          </motion.div>

          {step === 'ask3' && (
            <motion.p
              className="prop__sub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {evapore ? 'Il n’y a plus qu’une réponse possible.' : 'Réfléchis bien.'}
            </motion.p>
          )}

          <div className="prop__actions" ref={zoneRef}>
            <motion.button
              type="button"
              className="prop__btn prop__btn--yes"
              onClick={direOui}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              animate={evapore ? { scale: [1, 1.06, 1] } : {}}
              transition={evapore ? { repeat: Infinity, duration: 1.6 } : {}}
            >
              Oui Andrieu
            </motion.button>

            {!evapore && (
              <motion.button
                type="button"
                className={`prop__btn ${step === 'ask3' ? 'prop__btn--runaway' : ''}`}
                onClick={step === 'ask3' ? dodge : direNon}
                onPointerEnter={step === 'ask3' ? dodge : undefined}
                onPointerDown={step === 'ask3' ? dodge : undefined}
                animate={
                  step === 'ask3'
                    ? { x: offset.x, y: offset.y, scale: Math.max(0.3, 1 - dodges * 0.09) }
                    : { x: 0, y: 0, scale: 1 }
                }
                transition={{ type: 'spring', stiffness: 700, damping: 22 }}
              >
                Non Andrieu
              </motion.button>
            )}

            {evapore && (
              <motion.span
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 1, 0], scale: [0.6, 1.5, 2] }}
                transition={{ duration: 1.1 }}
                style={{ position: 'absolute', fontSize: 26, pointerEvents: 'none' }}
              >
                💨
              </motion.span>
            )}
          </div>
        </>
      )
    }

    if (step === 'unlock') {
      return (
        <>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            style={{ color: 'var(--accent)', marginBottom: 'var(--sp-5)' }}
          >
            <Icon name="heart-filled" size={44} />
          </motion.div>

          <h1 className="prop__question">Alors on commence.</h1>

          <div className="prop__bar">
            <motion.div
              className="prop__bar-fill"
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'linear', duration: 0.1 }}
            />
          </div>
          <div className="prop__pct">{progress}%</div>
        </>
      )
    }

    if (step === 'color') {
      return (
        <>
          <h1 className="prop__question">Une dernière chose.</h1>
          <p className="prop__sub">Tu veux que cet endroit devienne de ta couleur préférée ?</p>

          <div className="prop__actions">
            <motion.button
              type="button"
              className="prop__btn prop__btn--yes"
              onClick={() => void terminer(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              Oui, vas-y
            </motion.button>
            <button type="button" className="prop__btn" onClick={() => void terminer(false)}>
              Il est très bien comme ça
            </button>
          </div>
        </>
      )
    }

    // step === 'wash'
    return (
      <>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
          style={{ color: 'var(--accent)', marginBottom: 'var(--sp-5)' }}
        >
          <Icon name="sparkle" size={40} />
        </motion.div>
        <h1 className="prop__question">Évidemment que je savais.</h1>
      </>
    )
  }

  // Portail : un ancêtre animé (la transition de page) rendrait un
  // `position: fixed` relatif à lui-même au lieu de l'écran. L'overlay
  // se retrouverait planté au milieu de la page.
  return createPortal(
    <div className="prop">
      <Hearts />

      <div className="prop__inner">
        {/* Volontairement SANS AnimatePresence : `mode="wait"` attend la fin
            de l'animation de sortie avant de monter l'écran suivant, et
            cette animation ne tourne pas quand l'onglet est en arrière-plan
            (requestAnimationFrame est gelé). La séquence resterait figée.
            Ici le `key` suffit : React remplace, le nouvel écran apparaît. */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 22, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          {contenu()}
        </motion.div>
      </div>

      {step === 'wash' && (
        <motion.div
          className="prop__wave"
          initial={{ scale: 0, opacity: 0.9 }}
          animate={{ scale: 3.4, opacity: 0 }}
          transition={{ duration: 1.8, ease: [0.32, 0.72, 0, 1] }}
        />
      )}
    </div>,
    document.body,
  )
}

/* ---------------------------- Décor de fond ---------------------------- */

function Hearts() {
  // Positions figées au montage : elles ne doivent pas sauter à chaque rendu.
  const [seeds] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: 4 + Math.random() * 92,
      size: 11 + Math.random() * 20,
      delay: Math.random() * 7,
      duration: 9 + Math.random() * 8,
    })),
  )

  return (
    <div className="prop__hearts" aria-hidden="true">
      {seeds.map((s) => (
        <motion.div
          key={s.id}
          className="prop__heart"
          style={{ left: `${s.left}%`, bottom: -40 }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: '-115vh', opacity: [0, 0.4, 0.4, 0], rotate: [0, 14, -10, 0] }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <Icon name="heart-filled" size={s.size} />
        </motion.div>
      ))}
    </div>
  )
}
