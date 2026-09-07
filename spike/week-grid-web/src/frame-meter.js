/* Compteur de frames longues.

   Le budget par frame dépend de l'écran : 16,7 ms à 60 Hz, 8,3 ms à 120 Hz.
   On mesure d'abord la fréquence réelle (médiane des intervalles rAF au repos),
   puis on compte, pendant un geste, les frames qui dépassent ce budget.        */

const el = /** @type {HTMLElement} */ (document.getElementById('meter'))

let hz = 0
let budget = 16.7
let armed = false
let frames = 0
let longFrames = 0
let worst = 0
let last = 0

/** @type {number[]} */
const samples = []

function loop(/** @type {number} */ now) {
  if (last) {
    const dt = now - last
    if (samples.length < 180 && dt > 1 && dt < 100) samples.push(dt)
    if (samples.length === 180 && !hz) measure()
    if (armed) {
      frames += 1
      if (dt > budget * 1.5) longFrames += 1
      if (dt > worst) worst = dt
      paint()
    }
  }
  last = now
  requestAnimationFrame(loop)
}

function measure() {
  const sorted = [...samples].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 16.7
  hz = Math.round(1000 / median)
  // on arrondit aux fréquences usuelles
  hz = [60, 90, 120, 144].reduce((best, c) => (Math.abs(c - hz) < Math.abs(best - hz) ? c : best), 60)
  budget = 1000 / hz
  paint()
}

function paint() {
  if (!el) return
  const b = budget.toFixed(1)
  el.textContent = armed
    ? `${hz || '?'} Hz · ${longFrames}/${frames} > ${b} ms · pire ${worst.toFixed(0)}`
    : `${hz || '…'} Hz · budget ${b} ms`
  el.classList.toggle('bad', armed && longFrames > 0)
}

/** Remet le compteur à zéro et commence à compter (début d'un geste). */
export function arm() {
  armed = true; frames = 0; longFrames = 0; worst = 0; paint()
}

/** Arrête de compter, garde le résultat affiché (fin d'un geste). */
export function disarm() {
  armed = false
  if (el) el.textContent = `${hz || '?'} Hz · ${longFrames} frames > ${budget.toFixed(1)} ms · pire ${worst.toFixed(0)} ms`
}

/** @returns {{ hz: number, budgetMs: number, lastLongFrames: number, lastWorstMs: number }} */
export const report = () => ({ hz, budgetMs: budget, lastLongFrames: longFrames, lastWorstMs: worst })

requestAnimationFrame(loop)
