/* ------------------------------------------------------------------
   Le rendez-vous : une heure d'horloge parisienne, pas un instant.

   « 18 h 04 le 16 octobre » ne désigne pas le même instant selon le
   fuseau de l'appareil, et le changement d'heure de fin octobre décale
   encore les choses. On résout donc l'heure murale de Paris en instant
   précis, une fois pour toutes : le décompte vise le même moment que
   l'on soit à Lyon, à Varsovie ou dans un train.
   ------------------------------------------------------------------ */

/** Le fuseau qui fait foi. */
const ZONE = 'Europe/Paris'

/**
 * La date du rendez-vous, en heure de Paris.
 * Pour la changer, c'est ici et nulle part ailleurs.
 */
export const RENDEZVOUS_WALL = '2026-10-16T18:04'

/** Ce qu'on en dit à l'écran. */
export const RENDEZVOUS_LABEL = 'vendredi 16 octobre 2026'
export const RENDEZVOUS_TIME = '18 h 04'

/** Décalage du fuseau, en minutes, à l'instant donné. */
function zoneOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0)

  // Certains moteurs rendent « 24 » pour minuit : d'où le modulo.
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  )
  return (asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000
}

/**
 * Instant correspondant à une heure murale parisienne.
 *
 * Deux passes : la première approche le décalage, la seconde le confirme.
 * C'est ce qui rend le calcul juste la nuit du changement d'heure.
 */
export function instantFor(wall: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wall)
  if (!m) throw new Error(`Heure murale illisible : ${wall}`)
  const base = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!)
  const approx = base - zoneOffsetMinutes(new Date(base)) * 60000
  return base - zoneOffsetMinutes(new Date(approx)) * 60000
}

/** L'instant visé, calculé une seule fois. */
export const RENDEZVOUS_AT = instantFor(RENDEZVOUS_WALL)

/** Vrai si l'appareil n'est pas réglé sur l'heure de Paris. */
export function deviceIsElsewhere(): string | null {
  const deviceOffset = -new Date().getTimezoneOffset()
  if (deviceOffset === zoneOffsetMinutes(new Date(RENDEZVOUS_AT))) return null
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'un autre fuseau'
}

export type Remaining = {
  arrived: boolean
  days: number
  hours: number
  minutes: number
  seconds: number
  totalHours: number
  totalMinutes: number
  totalSeconds: number
}

/** Décompose le temps restant à partir d'un instant donné. */
export function remainingAt(now: Date, target = RENDEZVOUS_AT): Remaining {
  const left = target - now.getTime()
  if (left <= 0) {
    return {
      arrived: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalHours: 0,
      totalMinutes: 0,
      totalSeconds: 0,
    }
  }
  const total = Math.floor(left / 1000)
  return {
    arrived: false,
    days: Math.floor(total / 86400),
    hours: Math.floor(total / 3600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
    totalHours: Math.floor(total / 3600),
    totalMinutes: Math.floor(total / 60),
    totalSeconds: total,
  }
}
