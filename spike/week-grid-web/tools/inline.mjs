/* Fabrique la version « page unique » du spike, pour la publier telle quelle
   (artefact, pièce jointe, clé USB) : les modules sont concaténés dans l'ordre
   des dépendances, les liens vers le manifeste et le service worker retirés.

   Usage : node tools/inline.mjs > dist/nous-spike-web.html                  */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const ENTRY = 'src/main.js'

/** Ordre topologique des modules à partir de l'entrée. */
const order = []
const seen = new Set()
const namespaces = new Map() // alias -> chemin du module

function walk(rel) {
  if (seen.has(rel)) return
  seen.add(rel)
  const src = readFileSync(resolve(ROOT, rel), 'utf8')
  for (const m of src.matchAll(/^import\s+(?:\*\s+as\s+(\w+)|\{[^}]*\}|\w+)\s+from\s+'([^']+)'/gm)) {
    const [, alias, spec] = m
    if (!spec.startsWith('.')) continue
    const dep = resolve(dirname(resolve(ROOT, rel)), spec).slice(ROOT.length)
    if (alias) namespaces.set(alias, dep)
    walk(dep)
  }
  order.push(rel)
}
walk(ENTRY)

/** Noms exportés d'un module (pour reconstruire les imports d'espace de noms). */
function exportsOf(src) {
  const names = []
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:const|let|function)\s+(\w+)/gm)) names.push(m[1])
  for (const m of src.matchAll(/^export\s+\{([^}]+)\}/gm)) {
    for (const n of m[1].split(',')) names.push(n.trim().split(/\s+as\s+/).pop().trim())
  }
  return [...new Set(names)]
}

let bundle = ''
for (const rel of order) {
  const src = readFileSync(resolve(ROOT, rel), 'utf8')
  const body = src
    .replace(/^import[^;\n]*from\s+'[^']+'\s*;?\s*$/gm, '')
    .replace(/^export\s+(?=(?:async\s+)?(?:const|let|function|class))/gm, '')
    .replace(/^export\s+\{[^}]*\}\s*;?\s*$/gm, '')
  bundle += `\n/* ===== ${rel} ===== */\n${body}\n`
  for (const [alias, dep] of namespaces) {
    if (dep !== rel) continue
    bundle += `const ${alias} = { ${exportsOf(src).join(', ')} }\n`
    namespaces.delete(alias)
  }
}

const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8')
// on part du <meta viewport> : sans lui, un navigateur mobile met la page en
// 980 px de large et rien ne tient (et c'est lui qui porte viewport-fit=cover,
// nécessaire aux marges sûres de l'iPhone).
const inner = html
  .slice(html.indexOf('<meta name="viewport"'), html.lastIndexOf('</body>'))
  .replace(/^\s*<link rel="manifest"[^>]*>\s*$/gm, '')
  .replace(/^\s*<link rel="apple-touch-icon"[^>]*>\s*$/gm, '')
  .replace(/<script type="module" src="[^"]*"><\/script>/, `<script type="module">\n${bundle}\n</script>`)

process.stdout.write(inner.trimStart() + '\n')
