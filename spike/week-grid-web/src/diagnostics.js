/* ------------------------------------------------------------------
   Mesures.

   Cet onglet n'est pas une démonstration : c'est un instrument. Il répond aux
   inconnues laissées ouvertes par docs/09-zero-depense.md §10 sur un iPhone 16
   réel — fréquence d'écran, quota de stockage, notifications sans push, badge,
   persistance, hors ligne. Le bouton « Copier le rapport » produit un texte à
   recoller dans la conversation.
   ------------------------------------------------------------------ */

import * as meter from './frame-meter.js'

const root = /** @type {HTMLElement} */ (document.getElementById('measures'))

/** @type {Record<string, string>} */
const results = {}

/** @type {(k: string, v: string) => void} */
function set(k, v) { results[k] = v; render() }

/** @type {(title: string, rows: [string, string][], buttons?: {label: string, fn: () => void, primary?: boolean}[], hint?: string) => HTMLElement} */
function card(title, rows, buttons, hint) {
  const el = document.createElement('div')
  el.className = 'mcard'
  el.innerHTML =
    `<h2>${title}</h2>` +
    rows.map(([k, v]) => `<div class="mrow"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')
  if (buttons?.length) {
    const wrap = document.createElement('div')
    wrap.className = 'btns'
    for (const b of buttons) {
      const btn = document.createElement('button')
      btn.className = b.primary ? 'btn primary' : 'btn'
      btn.textContent = b.label
      btn.addEventListener('click', b.fn)
      wrap.appendChild(btn)
    }
    el.appendChild(wrap)
  }
  if (hint) {
    const p = document.createElement('p')
    p.className = 'hint'
    p.textContent = hint
    el.appendChild(p)
  }
  return el
}

/* ------------------------------ écran ------------------------------ */

function safeAreas() {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:0;left:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);visibility:hidden'
  document.body.appendChild(probe)
  const cs = getComputedStyle(probe)
  const out = `${cs.paddingTop} / ${cs.paddingBottom}`
  probe.remove()
  return out
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  /** @type {{ standalone?: boolean }} */ (navigator).standalone === true

/* ----------------------------- stockage ----------------------------- */

/** @type {() => Promise<{ usage: number, quota: number }>} */
async function estimate() {
  if (!navigator.storage?.estimate) return { usage: 0, quota: 0 }
  const e = await navigator.storage.estimate()
  return { usage: e.usage ?? 0, quota: e.quota ?? 0 }
}

const mb = (/** @type {number} */ n) => `${(n / 1024 / 1024).toFixed(1)} Mo`
const gb = (/** @type {number} */ n) => (n > 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(2)} Go` : mb(n))

/** Écrit N Mo dans IndexedDB, relit, mesure. */
async function storageTest(/** @type {number} */ megabytes) {
  set('Test d’écriture', 'en cours…')
  const t0 = performance.now()
  try {
    /** @type {IDBDatabase} */
    const db = await new Promise((res, rej) => {
      const req = indexedDB.open('nous-spike', 1)
      req.onupgradeneeded = () => req.result.createObjectStore('blobs')
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
    })
    const chunk = new Uint8Array(1024 * 1024)
    crypto.getRandomValues(chunk.subarray(0, 65536))
    await new Promise((res, rej) => {
      const tx = db.transaction('blobs', 'readwrite')
      const store = tx.objectStore('blobs')
      for (let i = 0; i < megabytes; i += 1) store.put(chunk, `c${i}`)
      tx.oncomplete = () => res(null)
      tx.onerror = () => rej(tx.error)
    })
    const written = performance.now() - t0
    const t1 = performance.now()
    /** @type {unknown} */
    const back = await new Promise((res, rej) => {
      const tx = db.transaction('blobs', 'readonly')
      const req = tx.objectStore('blobs').get(`c${megabytes - 1}`)
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
    })
    db.close()
    const read = performance.now() - t1
    const ok = back instanceof Uint8Array && back.byteLength === chunk.byteLength
    set('Test d’écriture', `${megabytes} Mo écrits en ${written.toFixed(0)} ms, relus en ${read.toFixed(0)} ms — ${ok ? 'intègres' : 'ALTÉRÉS'}`)
  } catch (err) {
    set('Test d’écriture', `échec : ${String(err)}`)
  }
  refresh()
}

async function clearStorage() {
  indexedDB.deleteDatabase('nous-spike')
  set('Test d’écriture', 'base supprimée')
  refresh()
}

/* --------------------------- notifications --------------------------- */

async function askPermission() {
  try {
    const p = await Notification.requestPermission()
    set('Autorisation', p)
  } catch (err) {
    set('Autorisation', `échec : ${String(err)}`)
  }
}

async function showNow() {
  try {
    const reg = await navigator.serviceWorker?.ready
    if (!reg) { set('Notification immédiate', 'pas de service worker (ouvrez la page en HTTPS)'); return }
    await reg.showNotification('Nous', {
      body: 'Notification affichée sans aucun serveur.',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: 'nous-test',
    })
    set('Notification immédiate', 'envoyée — visible ?')
  } catch (err) {
    set('Notification immédiate', `échec : ${String(err)}`)
  }
}

function showLater() {
  set('Notification différée', 'programmée dans 30 s — verrouillez l’écran maintenant')
  window.setTimeout(async () => {
    try {
      const reg = await navigator.serviceWorker?.ready
      await reg?.showNotification('Nous', { body: 'Rappel de test, 30 secondes plus tard.', tag: 'nous-later' })
      set('Notification différée', 'envoyée (la page était encore vivante)')
    } catch (err) {
      set('Notification différée', `échec : ${String(err)}`)
    }
  }, 30_000)
}

async function badge(/** @type {number | null} */ n) {
  const nav = /** @type {{ setAppBadge?: (n?: number) => Promise<void>, clearAppBadge?: () => Promise<void> }} */ (navigator)
  try {
    if (n === null) { await nav.clearAppBadge?.(); set('Badge', 'effacé') }
    else { await nav.setAppBadge?.(n); set('Badge', `mis à ${n}`) }
  } catch (err) {
    set('Badge', `échec : ${String(err)}`)
  }
}

/* ------------------------------- PWA ------------------------------- */

async function resetApp() {
  const regs = (await navigator.serviceWorker?.getRegistrations()) ?? []
  await Promise.all(regs.map((r) => r.unregister()))
  const keys = (await caches?.keys()) ?? []
  await Promise.all(keys.map((k) => caches.delete(k)))
  set('Réinitialisation', 'faite — rechargez la page')
}

/* ------------------------------ rapport ------------------------------ */

function reportText() {
  const lines = ['Rapport du spike web Nous', new Date().toISOString(), '']
  for (const [k, v] of Object.entries(results)) lines.push(`${k} : ${v}`)
  return lines.join('\n')
}

async function copyReport() {
  const text = reportText()
  try {
    await navigator.clipboard.writeText(text)
    set('Rapport', 'copié dans le presse-papiers')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;height:40vh'
    document.body.appendChild(ta)
    ta.select()
    set('Rapport', 'copie automatique refusée : sélectionnez le texte en bas')
  }
}

/* ------------------------------- rendu ------------------------------- */

let rendering = false
function render() {
  if (rendering) return
  rendering = true
  queueMicrotask(() => {
    rendering = false
    root.replaceChildren(
      card('Écran et système', [
        ['Fréquence mesurée', results['Fréquence'] ?? '…'],
        ['Budget par frame', results['Budget'] ?? '…'],
        ['Densité de pixels', String(window.devicePixelRatio)],
        ['Fenêtre', `${window.innerWidth} × ${window.innerHeight} px`],
        ['Marges sûres (haut / bas)', results['Marges'] ?? '—'],
        ['Mode web app', results['Standalone'] ?? '—'],
        ['Push disponible', results['Push'] ?? '…'],
        ['Système', results['Système'] ?? '…'],
      ], undefined,
        'Faites d’abord un drag dans l’onglet Semaine : la fréquence se mesure toute seule.'),

      card('Stockage hors ligne', [
        ['Utilisé', results['Utilisé'] ?? '…'],
        ['Quota annoncé', results['Quota'] ?? '…'],
        ['Persistant', results['Persistant'] ?? '…'],
        ['Test d’écriture', results['Test d’écriture'] ?? '—'],
      ], [
        { label: 'Écrire 20 Mo', fn: () => storageTest(20), primary: true },
        { label: 'Demander la persistance', fn: async () => { const ok = await navigator.storage?.persist?.(); set('Persistant', ok ? 'accordée' : 'refusée'); refresh() } },
        { label: 'Effacer', fn: clearStorage },
      ],
        'Le quota annoncé par iOS est théorique. Ce qui compte : écrire, fermer l’app, revenir demain, et vérifier que c’est toujours là.'),

      card('Notifications, sans aucun serveur', [
        ['Autorisation', results['Autorisation'] ?? Notification?.permission ?? 'indisponible'],
        ['Notification immédiate', results['Notification immédiate'] ?? '—'],
        ['Notification différée', results['Notification différée'] ?? '—'],
        ['Badge', results['Badge'] ?? '—'],
      ], [
        { label: 'Autoriser', fn: askPermission, primary: true },
        { label: 'Notifier maintenant', fn: showNow },
        { label: 'Dans 30 s', fn: showLater },
        { label: 'Badge 3', fn: () => badge(3) },
        { label: 'Effacer le badge', fn: () => badge(null) },
      ],
        'Sur iPhone, ces boutons ne marchent que si la page a été ajoutée à l’écran d’accueil et ouverte depuis là. Essayez « Notifier maintenant » dans trois situations et notez ce que vous voyez : app ouverte, app en arrière-plan (bouton Accueil juste avant), app fermée (balayée). « Dans 30 s » montre la limite : verrouillez l’écran, la notification n’arrivera pas — c’est pourquoi les rappels de l’iPhone devront venir du serveur.'),

      card('Application installée', [
        ['Service worker', results['SW'] ?? '…'],
        ['Contrôlée par le SW', results['Contrôle'] ?? '…'],
        ['Caches', results['Caches'] ?? '…'],
        ['En ligne', navigator.onLine ? 'oui' : 'non'],
        ['Réinitialisation', results['Réinitialisation'] ?? '—'],
      ], [
        { label: 'Vider et réinstaller', fn: resetApp },
        { label: 'Rafraîchir les mesures', fn: refresh },
      ],
        document.querySelector('link[rel="manifest"]')
          ? 'Test hors ligne : mode avion, puis fermez et rouvrez l’icône. La grille doit s’ouvrir normalement.'
          : 'Version démo : ni service worker ni installation ici. Les gestes, l’écran et le clavier se testent quand même ; pour le hors ligne et les notifications, ouvrez la version hébergée.'),

      card('Rapport', [['État', results['Rapport'] ?? '—']], [
        { label: 'Copier le rapport', fn: copyReport, primary: true },
      ],
        'Collez-le dans la conversation : il répond aux questions restées ouvertes sur l’iPhone.'),
    )
  })
}

export async function refresh() {
  const m = meter.report()
  // « mesurée pendant un geste » est la seule mention qui autorise à recopier
  // le chiffre dans le compte rendu : une valeur relevée au repos ne vaut rien
  // sur une dalle à cadence variable.
  results['Fréquence'] = m.hz ? `${m.hz} Hz${m.sure ? '' : ' (au repos, à refaire pendant un geste)'}` : 'pas encore mesurée'
  results['Période'] = m.hz ? `${m.periodMs.toFixed(2)} ms` : '—'
  results['Marges'] = safeAreas()
  results['Standalone'] = isStandalone() ? 'oui (écran d’accueil)' : 'non (onglet du navigateur)'
  const reg0 = await navigator.serviceWorker?.getRegistration()
  results['Push'] = reg0 && 'pushManager' in reg0 ? 'oui (pushManager exposé)' : 'non'
  results['Système'] = navigator.userAgent.slice(0, 120)
  const e = await estimate()
  results['Utilisé'] = e.quota ? mb(e.usage) : 'indisponible'
  results['Quota'] = e.quota ? gb(e.quota) : 'indisponible'
  results['Persistant'] = (await navigator.storage?.persisted?.()) ? 'oui' : 'non'
  const regs = (await navigator.serviceWorker?.getRegistrations()) ?? []
  results['SW'] = regs.length ? 'enregistré' : 'aucun (HTTPS requis)'
  results['Contrôle'] = navigator.serviceWorker?.controller ? 'oui' : 'non'
  results['Caches'] = ((await caches?.keys()) ?? []).join(', ') || 'aucun'
  render()
}

export function mountMeasures() {
  render()
  refresh()
  window.addEventListener('online', refresh)
  window.addEventListener('offline', refresh)
}
