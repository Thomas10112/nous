/* ------------------------------------------------------------------
   Compteur d'images longues.

   Même algorithme que le client React Native, à dessein : les deux téléphones
   doivent produire des relevés comparables, sinon la porte de décision de la
   phase 1 compare deux choses différentes.

   Le budget par image se MESURE — il ne s'arrondit pas vers une fréquence
   commerciale. On estime la période par vote majoritaire : une valeur ne
   l'emporte que si elle revient, jamais parce qu'elle est extrême. Et l'on ne
   calibre que pendant un geste : sur une dalle à cadence variable, la cadence
   au repos n'a aucun rapport avec celle du geste.
   ------------------------------------------------------------------ */

const el = /** @type {HTMLElement} */ (document.getElementById('meter'))

/** En dessous, ce n'est pas une image : doublon ou hoquet d'horloge. */
const MIN_DT = 2
/** Au-delà, l'onglet était en arrière-plan : l'intervalle mesure la pause. */
const PAUSE_DT = 250
const TOL = 0.12
const EMA = 0.05
const VOTE_CAP = 90
const MIN_VOTES = 48
const LONG_FACTOR = 1.5

let period = 0
let votes = 0
let fromGesture = false
let armed = false
let frames = 0
let longFrames = 0
let worst = 0
let last = 0

function loop(/** @type {number} */ now) {
  if (last) {
    const dt = now - last
    if (dt >= MIN_DT && dt <= PAUSE_DT) {
      // Le premier geste efface ce qui a été mesuré au repos.
      if (armed && !fromGesture) { fromGesture = true; period = 0; votes = 0 }
      if (armed || !fromGesture) {
        if (votes === 0) { period = dt; votes = 1 }
        else if (Math.abs(dt - period) <= period * TOL) {
          if (votes < VOTE_CAP) votes += 1
          period += (dt - period) * EMA
        } else {
          votes -= 1
          if (votes <= 0) { period = dt; votes = 1 }
        }
      }
      if (armed) {
        frames += 1
        if (dt > worst) worst = dt
        // Tant que la période n'est pas confirmée, aucune image n'est comptée
        // longue : un compte adossé à un budget faux est pire qu'aucun compte.
        if (votes >= MIN_VOTES && dt > period * LONG_FACTOR) longFrames += 1
        paint()
      }
    }
  }
  last = now
  requestAnimationFrame(loop)
}

function paint() {
  if (!el) return
  const pire = `pire ${worst.toFixed(0)} ms`
  if (votes < MIN_VOTES) {
    const pct = Math.round((votes / MIN_VOTES) * 100)
    el.textContent = `… Hz · calibrage ${fromGesture ? 'geste' : 'repos'} ${pct} % · ${pire}`
    el.classList.remove('bad')
    return
  }
  const marque = fromGesture ? '' : '≈ '
  // On affiche le seuil RÉELLEMENT appliqué, pas la période : l'ancienne
  // version imprimait le budget et comparait à 1,5 fois le budget.
  const seuil = (period * LONG_FACTOR).toFixed(1)
  el.textContent = armed
    ? `${marque}${Math.round(1000 / period)} Hz · ${period.toFixed(2)} ms · ${longFrames}/${frames} > ${seuil} ms · ${pire}`
    : `${marque}${Math.round(1000 / period)} Hz · ${period.toFixed(2)} ms · seuil ${seuil} ms`
  el.classList.toggle('bad', armed && longFrames > 0)
}

/** Remet le compteur à zéro et commence à compter (début d'un geste). */
export function arm() {
  armed = true; frames = 0; longFrames = 0; worst = 0; paint()
}

/** Arrête de compter, garde le résultat affiché (fin d'un geste). */
export function disarm() {
  armed = false
  paint()
}

/** @returns {{ hz: number, periodMs: number, sure: boolean, lastLongFrames: number, lastWorstMs: number }} */
export const report = () => ({
  hz: votes >= MIN_VOTES ? Math.round(1000 / period) : 0,
  periodMs: period,
  sure: votes >= MIN_VOTES && fromGesture,
  lastLongFrames: longFrames,
  lastWorstMs: worst,
})

requestAnimationFrame(loop)
