/* ------------------------------------------------------------------
   Connexion par surnom.

   Supabase authentifie par adresse e-mail. Ici on ne veut pas d'adresse :
   on veut un surnom. On fabrique donc une adresse technique a partir du
   surnom — elle n'est jamais affichee, elle ne sert qu'a Supabase.

     « Ma Puce »  ->  ma-puce@nous.local

   C'est pour ca que les deux comptes doivent etre crees dans Supabase
   avec exactement ces adresses-la (voir README).
   ------------------------------------------------------------------ */

import { normalize } from './utils'

/** Modifiable si Supabase refuse le domaine par defaut. */
export const LOGIN_DOMAIN = import.meta.env.VITE_LOGIN_DOMAIN?.trim() || 'nous.local'

/**
 * Transforme un surnom en identifiant stable.
 *
 * On enleve TOUT ce qui n'est pas une lettre ou un chiffre — y compris
 * les espaces et les tirets. C'est volontairement brutal : « Mon Cœur »,
 * « mon coeur », « moncoeur » et « MON-CŒUR » donnent tous `moncoeur`.
 * Une seule forme possible, donc aucun moyen de se tromper en tapant.
 */
export function loginSlug(nickname: string): string {
  return normalize(nickname)
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * Adresse technique correspondant a un surnom.
 *
 * Soupape de secours : si quelqu'un tape une adresse complete (avec un
 * « @ »), on la prend telle quelle. Ca permet toujours d'entrer meme si
 * le compte a ete cree avec une adresse qui ne suit pas la regle.
 */
export function loginEmail(nickname: string): string {
  const saisie = nickname.trim()
  if (saisie.includes('@')) return saisie.toLowerCase()
  return `${loginSlug(saisie)}@${LOGIN_DOMAIN}`
}

/** Retrouve le surnom a partir de l'adresse technique (pour l'affichage). */
export function nicknameFromEmail(email: string): string {
  return email.split('@')[0] ?? ''
}
