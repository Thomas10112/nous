/* ------------------------------------------------------------------
   On se voit.

   L'accueil compte les jours passes ensemble ; cette page compte ceux
   qui restent avant de se retrouver. Une seule date a la fois, reglee
   dans Reglages, pour que la page dise toujours la meme chose aux deux.
   ------------------------------------------------------------------ */

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store'
import { Icon } from '../components/ui/Icon'
import { Button, Empty } from '../components/ui/primitives'
import {
  ZONE,
  countdown,
  deviceMatchesZone,
  deviceZoneName,
  formatDayDateInZone,
  formatTimeInZone,
  pad2,
  zonedTimeToInstant,
} from '../lib/date'

const nf = new Intl.NumberFormat('fr-FR')
const plural = (n: number, one: string, many: string) => `${nf.format(n)} ${n === 1 ? one : many}`

export default function Rendezvous() {
  const { settings } = useStore()
  const rdv = settings.rendezvous
  // Ancre sur l'heure de Paris : un PC mal reglé ne doit pas decaler le
  // decompte, et vous devez voir le meme nombre tous les deux.
  const target = rdv?.at ? zonedTimeToInstant(rdv.at) : null

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!rdv || !target) {
    return (
      <div className="page">
        <Empty
          icon="calendar"
          title="Aucun rendez-vous"
          text="Choisissez la date de vos retrouvailles : le décompte s'affichera ici, et sur l'accueil."
          action={
            <Link to="/reglages">
              <Button variant="primary" icon="calendar">
                Choisir la date
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  const left = countdown(target, now)!
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000))
  const title = rdv.title.trim() || 'On se voit.'

  return (
    <div className="page">
      <motion.section
        className="rdv"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      >
        <p className="eyebrow rdv__eyebrow">{left.done ? 'Le moment est là' : 'Prochain rendez-vous'}</p>

        <h1 className="rdv__title">{left.done ? 'On y est.' : title}</h1>

        <p className="rdv__when">
          {formatDayDateInZone(target)} — <b>{formatTimeInZone(target)}</b>
          {rdv.place && (
            <span className="rdv__place">
              <Icon name="pin" size={13} />
              {rdv.place}
            </span>
          )}
        </p>

        {left.done ? (
          <>
            <div className="rdv__now">{formatTimeInZone(target)}</div>
            <p className="rdv__otherwise">
              Le compte à rebours est fini. La suite ne se raconte pas ici.
            </p>
          </>
        ) : (
          <>
            <div className="rdv__clock">
              <Unit num={nf.format(left.days)} label={left.days === 1 ? 'jour' : 'jours'} />
              <Unit num={pad2(left.hours)} label={left.hours === 1 ? 'heure' : 'heures'} />
              <Unit num={pad2(left.minutes)} label={left.minutes === 1 ? 'minute' : 'minutes'} />
              <Unit
                num={pad2(left.seconds)}
                label={left.seconds === 1 ? 'seconde' : 'secondes'}
                accent
              />
            </div>

            <p className="rdv__otherwise">
              Autrement dit : <b>{plural(Math.floor(totalSeconds / 3600), 'heure', 'heures')}</b>, ou{' '}
              <b>{plural(Math.floor(totalSeconds / 60), 'minute', 'minutes')}</b>, ou encore{' '}
              <b>{plural(totalSeconds, 'seconde', 'secondes')}</b> à faire passer.
            </p>
          </>
        )}

        {!deviceMatchesZone(target) && (
          <p className="rdv__zone">
            Cet appareil est réglé sur <b>{deviceZoneName()}</b>, pas sur {ZONE} — le décompte
            vise quand même {formatTimeInZone(target)} à Paris, comme sur le sien.
          </p>
        )}

        <div className="rdv__foot">
          <motion.span
            className="rdv__heart"
            animate={{ scale: [1, 1.22, 1.05, 1.14, 1] }}
            transition={{ repeat: Infinity, duration: 1, times: [0, 0.14, 0.3, 0.42, 1] }}
          >
            <Icon name="heart-filled" size={13} />
          </motion.span>
          <span>
            {left.done
              ? 'Vous pouvez déjà poser la prochaine date dans les '
              : 'La date se change dans les '}
            <Link to="/reglages">Réglages</Link>.
          </span>
        </div>
      </motion.section>
    </div>
  )
}

function Unit({ num, label, accent }: { num: string; label: string; accent?: boolean }) {
  return (
    <div className={`rdv__unit ${accent ? 'rdv__unit--accent' : ''}`}>
      <div className="rdv__num">{num}</div>
      <div className="rdv__label">{label}</div>
    </div>
  )
}
