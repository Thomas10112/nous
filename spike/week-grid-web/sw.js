/* Service worker minimal : coquille en cache, réseau d'abord pour la
   navigation avec repli sur le cache. Une version = un cache ; les anciens
   sont supprimés à l'activation. */

const VERSION = 'nous-spike-v2'
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/main.js',
  './src/day.js',
  './src/week.js',
  './src/chat.js',
  './src/diagnostics.js',
  './src/frame-meter.js',
  './src/domain/time.js',
  './src/domain/layout.js',
  './src/domain/phrase.js',
  './src/data/demo.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(req).then((hit) => hit ?? caches.match('./index.html'))),
  )
})

/* Web Push : la vraie PWA recevra un payload chiffré depuis une fonction Edge.
   Ici on se contente d'afficher ce qui arrive, pour tester la chaîne le jour où
   les clés VAPID existeront. Safari révoque la permission si un push n'affiche
   rien : on affiche toujours quelque chose. */
self.addEventListener('push', (e) => {
  let title = 'Nous'
  let body = 'Nouveau'
  try {
    const data = e.data?.json()
    if (data?.notification) { title = data.notification.title ?? title; body = data.notification.body ?? body }
    else if (data) { title = data.title ?? title; body = data.body ?? body }
  } catch { /* payload non JSON */ }
  e.waitUntil(self.registration.showNotification(title, { body, icon: './icons/icon-192.png', tag: 'nous' }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => {
    const client = list[0]
    if (client) return client.focus()
    return self.clients.openWindow('./')
  }))
})
