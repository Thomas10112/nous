/* Fabrique la version « page unique » du spike, pour la publier telle quelle
   (artefact, pièce jointe, clé USB).

   Les modules ne sont pas concaténés bêtement : chacun garde sa portée dans une
   fonction, et ses exports sont déposés dans un registre. Sans cela, deux vues
   qui déclarent toutes deux `scroller`, `drag` ou `slotH` se marcheraient
   dessus — c'est exactement ce qui est arrivé quand la vue Jour est arrivée.

   Le sous-ensemble d'ES modules traité est celui du projet : imports nommés,
   imports d'espace de noms, exports de déclarations. Ni export par défaut, ni
   ré-export, ni dépendance circulaire.

   Usage : node tools/inline.mjs > dist/nous-spike-web.html                  */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const ENTRY = 'src/main.js'

const IMPORT_RE = /^import\s+(?:\*\s+as\s+(\w+)|\{([^}]*)\}|(\w+))\s+from\s+'([^']+)'\s*;?\s*$/gm

/** Ordre topologique des modules à partir de l'entrée. */
const order = []
const seen = new Set()

/** @param {string} rel @param {string} spec */
const resolveDep = (rel, spec) => resolve(dirname(resolve(ROOT, rel)), spec).slice(ROOT.length)

function walk(rel) {
  if (seen.has(rel)) return
  seen.add(rel)
  const src = readFileSync(resolve(ROOT, rel), 'utf8')
  for (const m of src.matchAll(IMPORT_RE)) {
    if (m[4].startsWith('.')) walk(resolveDep(rel, m[4]))
  }
  order.push(rel)
}
walk(ENTRY)

/** Noms exportés d'un module. */
function exportsOf(src) {
  const names = []
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:const|let|function|class)\s+(\w+)/gm)) names.push(m[1])
  for (const m of src.matchAll(/^export\s+\{([^}]+)\}/gm)) {
    for (const n of m[1].split(',')) names.push(n.trim().split(/\s+as\s+/).pop().trim())
  }
  return [...new Set(names)]
}

let bundle = 'const __M = {}\n'
for (const rel of order) {
  const src = readFileSync(resolve(ROOT, rel), 'utf8')
  const names = exportsOf(src)
  const body = src
    // chaque import devient une liaison locale prise dans le registre
    .replace(IMPORT_RE, (whole, ns, named, def, spec) => {
      if (!spec.startsWith('.')) return whole
      const dep = JSON.stringify(resolveDep(rel, spec))
      if (ns) return `const ${ns} = __M[${dep}]`
      if (named) return `const {${named}} = __M[${dep}]`
      return `const ${def} = __M[${dep}].default`
    })
    .replace(/^export\s+(?=(?:async\s+)?(?:const|let|function|class))/gm, '')
    .replace(/^export\s+\{[^}]*\}\s*;?\s*$/gm, '')

  bundle +=
    `\n/* ===== ${rel} ===== */\n__M[${JSON.stringify(rel)}] = (() => {\n${body}\n` +
    `return { ${names.join(', ')} }\n})()\n`
}

const icon = readFileSync(resolve(ROOT, 'icons/icon-192.png')).toString('base64')
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8')
// on part du <meta viewport> : sans lui, un navigateur mobile met la page en
// 980 px de large et rien ne tient (et c'est lui qui porte viewport-fit=cover,
// nécessaire aux marges sûres de l'iPhone).
const inner = html
  .slice(html.indexOf('<meta name="viewport"'), html.lastIndexOf('</body>'))
  .replace(/^\s*<link rel="manifest"[^>]*>\s*$/gm, '')
  .replace(/^\s*<link rel="apple-touch-icon"[^>]*>\s*$/gm, '')
  // l'icône est embarquée : un fichier unique doit se suffire, sinon le
  // navigateur va chercher /favicon.ico et ramène un 404.
  .replace(/(<link rel="icon" href=")[^"]*(")/, `$1data:image/png;base64,${icon}$2`)
  .replace(/<script type="module" src="[^"]*"><\/script>/, `<script type="module">\n${bundle}\n</script>`)

process.stdout.write(inner.trimStart() + '\n')
