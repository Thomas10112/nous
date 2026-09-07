/* Messagerie factice : elle ne sert qu'à juger le clavier de l'iPhone dans une
   web app d'écran d'accueil (viewport qui rétrécit, liste qui suit, saut à la
   fermeture) — le bug connu d'iOS 26.0, corrigé en 26.1. */

import { DEMO_MESSAGES } from './data/demo.js'

const list = /** @type {HTMLElement} */ (document.getElementById('msgs'))
const form = /** @type {HTMLFormElement} */ (document.getElementById('composer'))
const input = /** @type {HTMLInputElement} */ (document.getElementById('composer-input'))

/** @type {(text: string, mine: boolean) => void} */
function add(text, mine) {
  const el = document.createElement('div')
  el.className = 'msg'
  if (mine) el.setAttribute('data-mine', '')
  el.textContent = text
  list.appendChild(el)
  list.scrollTop = list.scrollHeight
}

export function mountChat() {
  for (const m of DEMO_MESSAGES) add(m.text, m.mine)
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const text = input.value.trim()
    if (!text) return
    add(text, true)
    input.value = ''
    window.setTimeout(() => add('🤍', false), 700)
  })
  // le clavier iOS réduit la fenêtre : on garde le dernier message visible
  window.visualViewport?.addEventListener('resize', () => {
    if (document.activeElement === input) list.scrollTop = list.scrollHeight
  })
}
