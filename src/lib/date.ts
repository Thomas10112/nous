/* Formatage et calculs de dates, en francais. */

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const JOURS = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
]

export const toDate = (value: string | Date | undefined | null): Date | null => {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value.length === 10 ? `${value}T12:00:00` : value)
  return Number.isNaN(d.getTime()) ? null : d
}

export const todayISO = (): string => new Date().toISOString().slice(0, 10)

/** "12 mars 2024" */
export const formatDate = (value?: string | Date | null): string => {
  const d = toDate(value)
  if (!d) return ''
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`
}

/** "12 mars" (sans annee si annee courante) */
export const formatDateShort = (value?: string | Date | null): string => {
  const d = toDate(value)
  if (!d) return ''
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return sameYear ? `${d.getDate()} ${MOIS[d.getMonth()]}` : formatDate(d)
}

/** "mars 2024" */
export const formatMonthYear = (value?: string | Date | null): string => {
  const d = toDate(value)
  if (!d) return ''
  return `${MOIS[d.getMonth()]} ${d.getFullYear()}`
}

/** "mardi 12 mars 2024" */
export const formatDayDate = (value?: string | Date | null): string => {
  const d = toDate(value)
  if (!d) return ''
  return `${JOURS[d.getDay()]} ${formatDate(d)}`
}

/** "18 h 04" — l'heure telle qu'on la dit, pas telle qu'on la tape. */
export const formatTime = (value?: string | Date | null): string => {
  const d = toDate(value)
  if (!d) return ''
  return `${d.getHours()} h ${pad2(d.getMinutes())}`
}

/** "12 mars 2024 à 18h30" */
export const formatDateTime = (value?: string | Date | null): string => {
  const d = toDate(value)
  if (!d) return ''
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${formatDate(d)} à ${h}h${m}`
}

/** Nombre de jours entiers entre deux dates. */
export const daysBetween = (a: Date, b: Date): number =>
  Math.floor((b.getTime() - a.getTime()) / 86400000)

export interface Elapsed {
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
  totalDays: number
}

/** Duree ecoulee depuis `start`, decomposee en annees / mois / jours. */
export const elapsedSince = (start: string | Date, now: Date = new Date()): Elapsed => {
  const from = toDate(start) ?? now

  let years = now.getFullYear() - from.getFullYear()
  let months = now.getMonth() - from.getMonth()
  let days = now.getDate() - from.getDate()

  if (days < 0) {
    months -= 1
    // nombre de jours du mois precedent
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
    totalDays: Math.max(0, daysBetween(from, now)),
  }
}

/** Prochaine date anniversaire (jour + mois) de `start`, et jours restants. */
export const nextAnniversary = (start: string | Date, now: Date = new Date()) => {
  const from = toDate(start)
  if (!from) return null
  let next = new Date(now.getFullYear(), from.getMonth(), from.getDate(), 12)
  if (next.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime()) {
    next = new Date(now.getFullYear() + 1, from.getMonth(), from.getDate(), 12)
  }
  const inDays = daysBetween(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12), next)
  const years = next.getFullYear() - from.getFullYear()
  return { date: next, inDays, years }
}

/** Prochain cap rond en jours (500, 1000, 1111, 2000...). */
export const nextMilestoneDays = (totalDays: number): { at: number; inDays: number } => {
  const caps = [100, 200, 300, 365, 500, 730, 1000, 1095, 1500, 1825, 2000, 2500, 3000, 3650, 5000, 7300, 10000]
  const at = caps.find((c) => c > totalDays) ?? Math.ceil((totalDays + 1) / 1000) * 1000
  return { at, inDays: at - totalDays }
}

/** "dans 3 jours" / "il y a 2 mois" */
export const relative = (value: string | Date): string => {
  const d = toDate(value)
  if (!d) return ''
  const diff = Math.round((d.getTime() - Date.now()) / 1000)
  const abs = Math.abs(diff)
  const fut = diff > 0

  const say = (n: number, one: string, many: string) =>
    fut ? `dans ${n} ${n > 1 ? many : one}` : `il y a ${n} ${n > 1 ? many : one}`

  if (abs < 60) return fut ? "dans un instant" : "à l'instant"
  if (abs < 3600) return say(Math.round(abs / 60), 'minute', 'minutes')
  if (abs < 86400) return say(Math.round(abs / 3600), 'heure', 'heures')
  if (abs < 2592000) return say(Math.round(abs / 86400), 'jour', 'jours')
  if (abs < 31536000) return say(Math.round(abs / 2592000), 'mois', 'mois')
  return say(Math.round(abs / 31536000), 'an', 'ans')
}

/* ------------------------------------------------------------------
   Fuseau de reference.

   Un rendez-vous doit viser le MEME instant pour les deux, meme si un
   PC est mal regle ou si l'un des deux voyage. On l'ancre donc sur un
   fuseau fixe plutot que sur celui de l'appareil, et on l'affiche dans
   ce fuseau-la.
   ------------------------------------------------------------------ */

export const ZONE = 'Europe/Paris'

/** Decalage du fuseau `zone` a l'instant donne, en minutes. */
const zoneOffsetMinutes = (date: Date, zone: string = ZONE): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  // Certains moteurs rendent "24" pour minuit : d'ou le modulo.
  const asUTC = Date.UTC(
    get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'),
  )
  return (asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000
}

/**
 * Une heure d'horloge ("2026-09-11T18:04") lue dans `zone`, pas dans le
 * fuseau de l'appareil. Deux passes : la premiere approche le decalage,
 * la seconde le confirme — ce qui compte la nuit du changement d'heure.
 */
export const zonedTimeToInstant = (local: string, zone: string = ZONE): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(local)
  if (!m) return null
  const [y, mo, d, h, mi] = m.slice(1).map(Number)
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  let ts = wall - zoneOffsetMinutes(new Date(wall), zone) * 60000
  ts = wall - zoneOffsetMinutes(new Date(ts), zone) * 60000
  return new Date(ts)
}

/** "vendredi 11 septembre 2026", lu dans `zone`. */
export const formatDayDateInZone = (date: Date, zone: string = ZONE): string =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: zone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)

/** "18 h 04", lu dans `zone`. */
export const formatTimeInZone = (date: Date, zone: string = ZONE): string =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(':', ' h ')

/** L'appareil est-il a la meme heure que le fuseau de reference ? */
export const deviceMatchesZone = (date: Date, zone: string = ZONE): boolean =>
  -date.getTimezoneOffset() === zoneOffsetMinutes(date, zone)

/** Le fuseau de l'appareil, tel qu'il se nomme ("Europe/Paris", "UTC"...). */
export const deviceZoneName = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'inconnu'

/** Decompte jusqu'a une date, en parties. */
export const countdown = (target: string | Date, now: Date = new Date()) => {
  const d = toDate(target)
  if (!d) return null
  let ms = d.getTime() - now.getTime()
  const done = ms <= 0
  ms = Math.max(0, ms)
  return {
    done,
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
  }
}

export const pad2 = (n: number): string => n.toString().padStart(2, '0')
