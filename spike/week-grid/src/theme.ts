/* Sous-ensemble des tokens de Nous — palette « bleu » (celle que le couple a choisie,
   relevé du 06/09/2026), thème clair. Valeurs de tokens.css. */
import { Platform } from 'react-native'

export const colors = {
  bg: '#f5f9fc',
  bgTint: '#e8f1f8',
  surface: '#ffffff',
  surface2: '#f4f9fd',
  surface3: '#e7f0f8',
  paper: '#fdfefe',
  ink: '#22303c',
  ink2: '#5c6f7f',
  ink3: '#8ea0ae',
  line: 'rgba(34,60,82,0.10)',
  lineStrong: 'rgba(34,60,82,0.18)',
  accent: '#5f97c6',
  accentSoft: '#e0edf8',
  accentInk: '#3f6f9c',
  gold: '#d8a95c',
  goldSoft: '#f7eeda',
  goldInk: '#8a6a2a',
  sage: '#6fa89a',
  plum: '#8189bf',
  plumSoft: '#e8eaf7',
  plumInk: '#575f9a',
  sky: '#6aa7d8',
  skySoft: '#e2eff9',
  inkOnAccent: '#ffffff',
} as const

/* Fraunces n'est pas embarquée dans le spike : serif système en attendant. */
export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
}

export const radius = { xs: 8, sm: 12, md: 18, lg: 26, full: 999 } as const
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32 } as const

export const springs = {
  firm: { stiffness: 380, damping: 32 },
  pill: { stiffness: 420, damping: 36 },
  soft: { stiffness: 240, damping: 17 },
  lively: { stiffness: 700, damping: 22 },
} as const

/** Grille */
export const GUTTER_W = 44
export const SLOT_BASE_H = 30
export const ZOOM_MIN = 0.8
export const ZOOM_MAX = 1.6
export const HIT_MIN = 44
export const EDGE_AUTOSCROLL = 56
export const LONG_PRESS_MS = 350
/** Hauteur d'une bande de nuit repliée (parti pris n°5 du design system). */
export const BAND_H = 28

/** Teinte à ~14 % d'une couleur hex sur papier. */
export function tint(hex: string, alpha = 0.14): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
