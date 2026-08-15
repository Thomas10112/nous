/* Petits utilitaires partages. */

export const uid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const nowISO = (): string => new Date().toISOString()

export const cx = (...parts: (string | false | null | undefined)[]): string =>
  parts.filter(Boolean).join(' ')

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v))

export const round = (v: number, decimals = 1): number => {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** Trie une copie du tableau sans muter l'original. */
export const sortBy = <T>(arr: T[], key: (item: T) => number | string, dir: 'asc' | 'desc' = 'asc'): T[] =>
  [...arr].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    if (ka === kb) return 0
    const cmp = ka < kb ? -1 : 1
    return dir === 'asc' ? cmp : -cmp
  })

/** Retire les doublons en gardant l'ordre. */
export const uniq = <T>(arr: T[]): T[] => [...new Set(arr)]

export const debounce = <A extends unknown[]>(fn: (...args: A) => void, ms: number) => {
  let t: ReturnType<typeof setTimeout> | undefined
  return (...args: A) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

/** Enleve les accents et la casse : pratique pour la recherche. */
export const normalize = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export const matches = (haystack: string, needle: string): boolean =>
  normalize(haystack).includes(normalize(needle))

/** Couleur de texte lisible sur un fond donne. */
export const readableOn = (hex: string): string => {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return l > 0.62 ? '#2e2226' : '#ffffff'
}

export const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

/** Telecharge un objet en JSON (sauvegarde manuelle). */
export const downloadJSON = (data: unknown, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
