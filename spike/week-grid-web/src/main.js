/* Coquille : trois onglets, un service worker, et rien d'autre. */

import { mountWeek } from './week.js'
import { mountChat } from './chat.js'
import { mountMeasures, refresh } from './diagnostics.js'

const screens = {
  week: /** @type {HTMLElement} */ (document.getElementById('screen-week')),
  chat: /** @type {HTMLElement} */ (document.getElementById('screen-chat')),
  measures: /** @type {HTMLElement} */ (document.getElementById('screen-measures')),
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const name = /** @type {string} */ (/** @type {HTMLElement} */ (tab).dataset.screen)
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)))
    for (const [key, el] of Object.entries(screens)) el.toggleAttribute('data-active', key === name)
    if (name === 'measures') refresh()
  })
})

mountWeek()
mountChat()
mountMeasures()

// La version démo (page unique, sans manifeste) n'a pas de service worker :
// on ne l'enregistre que dans la version hébergée, en HTTPS.
const installable = Boolean(document.querySelector('link[rel="manifest"]'))
if (installable && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* pas bloquant */ })
}
