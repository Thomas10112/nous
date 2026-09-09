/* Test de fumée du spike web, en Chromium tactile : la grille se rend, le
   long-press prend la main sur le défilement, et un mouvement AVANT 350 ms
   défile au lieu de déplacer. C'est l'arbitrage des gestes qui est vérifié. */

import { createRequire } from 'node:module'

// playwright est installé globalement dans cet environnement : NODE_PATH suffit
// à require(), qui l'honore encore (contrairement à import).
const { chromium, devices } = createRequire(import.meta.url)('playwright')

const URL = process.env.URL ?? 'http://127.0.0.1:8099/'
// CHROME=/chemin/vers/chromium permet d'utiliser un navigateur déjà présent
// quand celui qu'attend playwright n'est pas installé.
const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
)
const context = await browser.newContext({ ...devices['iPhone 13'], hasTouch: true })
const page = await context.newPage()

/** @type {string[]} */
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(URL, { waitUntil: 'networkidle' })
const cdp = await context.newCDPSession(page)

// la vue Jour est désormais l'écran d'accueil : ce test porte sur la Semaine
await page.locator('.tab[data-screen="week"]').click()
await page.waitForTimeout(200)

const touch = async (type, x, y) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
  })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const check = (name, ok, extra = '') => {
  console.log(`${ok ? '  ok  ' : ' ÉCHEC'} ${name}${extra ? ' — ' + extra : ''}`)
  if (!ok) process.exitCode = 1
}

/* 1. rendu */
const count = await page.locator('#screen-week .ev').count()
check('26 blocs rendus dans la Semaine', count === 26, `${count} blocs`)
check('gouttière des heures', (await page.locator('#gutter span').count()) === 24)
check('7 colonnes', (await page.locator('.col').count()) === 7)

/* 2. un mouvement AVANT 350 ms doit défiler, pas déplacer */
const target = page.locator('#screen-week .ev').first()
let box = await target.boundingBox()
const before = await page.evaluate(() => document.getElementById('scroller').scrollTop)
// position du bloc DANS la grille, avant le geste : c'est elle qui ne doit pas
// bouger. La comparer au premier `.ev` du document reviendrait à interroger la
// vue Jour, qui est rendue elle aussi.
const topInGridBefore = await target.evaluate((el) => el.style.top)
await touch('touchStart', box.x + box.width / 2, box.y + 8)
await sleep(60)
for (let i = 1; i <= 6; i += 1) { await touch('touchMove', box.x + box.width / 2, box.y + 8 - i * 12); await sleep(12) }
await touch('touchEnd', 0, 0)
await sleep(120)
const after = await page.evaluate(() => document.getElementById('scroller').scrollTop)
const topInGridAfter = await target.evaluate((el) => el.style.top)
check('mouvement avant 350 ms : la grille défile', after !== before, `scrollTop ${before} → ${after}`)
check('mouvement avant 350 ms : le bloc ne bouge pas dans la grille',
  topInGridAfter === topInGridBefore, `top ${topInGridBefore} → ${topInGridAfter}`)

/* 3. long-press puis glissé : le bloc s'accroche au créneau suivant */
await target.scrollIntoViewIfNeeded()
await sleep(120)
box = await target.boundingBox()
const topBefore = await target.evaluate((el) => parseFloat(el.style.top))
await touch('touchStart', box.x + box.width / 2, box.y + 8)
await sleep(450)
const lifted = await target.evaluate((el) => el.hasAttribute('data-lift'))
check('long-press de 350 ms : le bloc se soulève', lifted)
for (let i = 1; i <= 8; i += 1) { await touch('touchMove', box.x + box.width / 2, box.y + 8 + i * 8); await sleep(12) }
await sleep(60)
await touch('touchEnd', 0, 0)
await sleep(150)
const topAfter = await page.locator('#screen-week .ev').first().evaluate((el) => parseFloat(el.style.top))
check('glissé accroché aux 30 min', topAfter > topBefore && (topAfter - topBefore) % 30 === 0,
  `top ${topBefore} → ${topAfter}`)

/* 4. tap simple : sélection et poignées */
await page.locator('#screen-week .ev').first().scrollIntoViewIfNeeded()
await sleep(120)
box = await page.locator('#screen-week .ev').first().boundingBox()
await touch('touchStart', box.x + box.width / 2, box.y + 8)
await sleep(80)
await touch('touchEnd', 0, 0)
await sleep(120)
check('tap : sélection', (await page.locator('#screen-week .ev[data-sel]').count()) === 1)
check('tap : deux poignées', (await page.locator('#screen-week .handle').count()) === 2)

/* 5. la nuit repliée (vue Jour) */
await page.locator('.tab[data-screen="day"]').click()
await sleep(300)
const bandes = page.locator('#screen-day .nightband')
check('deux bandes de nuit', (await bandes.count()) === 2)
const hauteurRepliee = await page.locator('#daycanvas').evaluate((el) => el.getBoundingClientRect().height)
// 2 × 28 px de bande + 32 créneaux de 30 px : la nuit ne prend plus 14 heures
check('canevas replié', Math.round(hauteurRepliee) === 1016, `${Math.round(hauteurRepliee)} px`)
// 7 h doit tomber juste sous la bande du haut, donc visible sans défiler
const y7 = await page.evaluate(() => {
  const g = document.querySelectorAll('#daygutter span')
  return g[7] instanceof HTMLElement ? parseFloat(g[7].style.top) : -1
})
check('7 h en haut de la page', y7 === 28, `y = ${y7}`)
const cacheMinuit = await page.evaluate(() => {
  const g = document.querySelectorAll('#daygutter span')
  return g[3] instanceof HTMLElement ? g[3].style.opacity : '?'
})
check('les heures de la nuit sont effacées', cacheMinuit === '0', `opacité ${cacheMinuit}`)
check('la bande annonce ce qu\'elle cache', /^la nuit/.test((await bandes.first().textContent()) ?? ''))

await bandes.first().click()
await sleep(250)
const hauteurDepliee = await page.locator('#daycanvas').evaluate((el) => el.getBoundingClientRect().height)
check('la nuit se déplie', Math.round(hauteurDepliee) === 1440, `${Math.round(hauteurDepliee)} px`)
check('et se referme d\'un tap', ((await bandes.first().textContent()) ?? '').includes('replier'))
await bandes.first().click()
await sleep(250)
check('retour à la nuit repliée',
  Math.round(await page.locator('#daycanvas').evaluate((el) => el.getBoundingClientRect().height)) === 1016)

/* 6. onglets */
await page.locator('.tab[data-screen="measures"]').click()
await sleep(300)
check('onglet Mesures', await page.locator('#screen-measures').isVisible())
check('cartes de mesures', (await page.locator('.mcard').count()) >= 5)
await page.locator('.tab[data-screen="chat"]').click()
await sleep(150)
check('onglet Messages', (await page.locator('.msg').count()) === 6)

await page.locator('.tab[data-screen="week"]').click()
await sleep(200)
await page.screenshot({ path: 'dist/apercu-semaine.png' })

check('aucune erreur console', errors.length === 0, errors.join(' | '))
await browser.close()
console.log(process.exitCode ? '\nTest de fumée : ÉCHEC' : '\nTest de fumée : tout est vert')
