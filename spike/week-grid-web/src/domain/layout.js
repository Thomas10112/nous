/* Chevauchements d'une colonne de jour — porté depuis
   spike/week-grid/src/domain/layout.ts. Deux items qui se chevauchent sont
   posés l'un sur l'autre ; au-delà de deux, en colonnes. */

/**
 * @typedef {{ id: string, startSlot: number, endSlot: number }} Placed
 * @typedef {{ id: string, column: number, columns: number, nested: number }} Placement
 */

/** @type {(a: Placed, b: Placed) => boolean} */
const overlaps = (a, b) => a.startSlot < b.endSlot && b.startSlot < a.endSlot

/** @type {(items: readonly Placed[]) => Placement[]} */
export function layoutDay(items) {
  const sorted = [...items].sort(
    (a, b) => a.startSlot - b.startSlot || b.endSlot - b.startSlot - (a.endSlot - a.startSlot),
  )
  const parent = sorted.map((_, i) => i)
  /** @type {(i: number) => number} */
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(/** @type {number} */ (parent[i]))))
  /** @type {(a: number, b: number) => void} */
  const union = (a, b) => { parent[find(a)] = find(b) }
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const a = sorted[i], b = sorted[j]
      if (a && b && overlaps(a, b)) union(i, j)
    }
  }

  /** @type {Map<number, number[]>} */
  const groups = new Map()
  sorted.forEach((_, i) => {
    const root = find(i)
    const list = groups.get(root) ?? []
    list.push(i)
    groups.set(root, list)
  })

  /** @type {Placement[]} */
  const out = []
  for (const members of groups.values()) {
    if (members.length === 2) {
      const [first, second] = members
      const a = sorted[/** @type {number} */ (first)], b = sorted[/** @type {number} */ (second)]
      if (a && b) {
        out.push({ id: a.id, column: 0, columns: 1, nested: 0 })
        out.push({ id: b.id, column: 0, columns: 1, nested: 1 })
      }
      continue
    }
    /** @type {number[]} */
    const columnEnds = []
    /** @type {Map<number, number>} */
    const assigned = new Map()
    for (const idx of members) {
      const item = sorted[idx]
      if (!item) continue
      let col = columnEnds.findIndex((end) => end <= item.startSlot)
      if (col === -1) { col = columnEnds.length; columnEnds.push(item.endSlot) }
      else { columnEnds[col] = item.endSlot }
      assigned.set(idx, col)
    }
    for (const idx of members) {
      const item = sorted[idx]
      if (item) out.push({ id: item.id, column: assigned.get(idx) ?? 0, columns: columnEnds.length, nested: 0 })
    }
  }
  return out
}
