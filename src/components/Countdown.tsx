import { motion } from 'framer-motion'
import { useMemo } from 'react'
import {
  RENDEZVOUS_LABEL,
  RENDEZVOUS_TIME,
  deviceIsElsewhere,
  remainingAt,
} from '../lib/rendezvous'
import './countdown.css'

const nf = new Intl.NumberFormat('fr-FR')
const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
const plural = (n: number, one: string, many: string) => `${nf.format(n)} ${n === 1 ? one : many}`

/**
 * Le compte à rebours du rendez-vous.
 *
 * Il ne tient pas sa propre horloge : l'accueil en a déjà une, qui bat à
 * la seconde. Deux intervalles pour la même page se désynchroniseraient
 * visiblement, alors on lui passe le `tick` existant.
 */
export function Countdown({ tick, who }: { tick: Date; who?: string }) {
  const left = remainingAt(tick)
  const elsewhere = useMemo(() => deviceIsElsewhere(), [])

  const spoken = left.arrived
    ? `Il est ${RENDEZVOUS_TIME}, le rendez-vous est arrivé.`
    : `${plural(left.days, 'jour', 'jours')}, ${plural(left.hours, 'heure', 'heures')} et ${plural(left.minutes, 'minute', 'minutes')} avant ${RENDEZVOUS_TIME}.`

  return (
    <motion.section
      className="rdv"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.44, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      aria-label="Compte à rebours du prochain rendez-vous"
    >
      <p className="rdv__eyebrow">rendez-vous</p>

      <h2 className="rdv__title">
        {left.arrived ? 'On y est' : 'On se voit'}
        {who ? (
          <>
            , <em>{who}</em>.
          </>
        ) : (
          '.'
        )}
      </h2>

      <p className="rdv__when">
        {RENDEZVOUS_LABEL} — <b>{RENDEZVOUS_TIME}</b>
        <span className="rdv__zone">
          {elsewhere ? `heure de Paris — cet appareil est sur ${elsewhere}` : 'heure de Paris'}
        </span>
      </p>

      {left.arrived ? (
        <>
          <div className="rdv__arrived">{RENDEZVOUS_TIME}.</div>
          <p className="rdv__otherwise">
            Le compte à rebours est fini. La suite ne se raconte pas ici.
          </p>
        </>
      ) : (
        <>
          <div className="rdv__clock" aria-hidden="true">
            <Unit value={nf.format(left.days)} label={left.days === 1 ? 'jour' : 'jours'} />
            <Unit value={pad(left.hours)} label={left.hours === 1 ? 'heure' : 'heures'} />
            <Unit value={pad(left.minutes)} label={left.minutes === 1 ? 'minute' : 'minutes'} />
            <Unit
              value={pad(left.seconds)}
              label={left.seconds === 1 ? 'seconde' : 'secondes'}
              seconds
            />
          </div>

          <p className="rdv__otherwise">
            Autrement dit : <b>{plural(left.totalHours, 'heure', 'heures')}</b>, ou{' '}
            <b>{plural(left.totalMinutes, 'minute', 'minutes')}</b>, ou encore{' '}
            <b>{plural(left.totalSeconds, 'seconde', 'secondes')}</b> à faire passer.
          </p>
        </>
      )}

      {/* Annoncé à la minute : lire chaque seconde à voix haute serait insupportable. */}
      <p className="rdv__sr" role="status" aria-live="polite">
        {spoken}
      </p>
    </motion.section>
  )
}

function Unit({ value, label, seconds }: { value: string; label: string; seconds?: boolean }) {
  return (
    <div className={`rdv__unit${seconds ? ' rdv__unit--seconds' : ''}`}>
      <div className="rdv__value">{value}</div>
      <div className="rdv__label">{label}</div>
    </div>
  )
}
