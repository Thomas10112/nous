/* ------------------------------------------------------------------
   Mise en page d'une colonne de jour : chevauchements.

   Deux items qui se chevauchent sont rendus « l'un sur l'autre » (nested,
   décalage de 6 px) ; au-delà de deux, en colonnes (coloration d'intervalles).
   Logique pure, testable en Node.
   ------------------------------------------------------------------ */

export interface Placed {
  id: string
  startSlot: number
  endSlot: number
}

export interface Placement {
  id: string
  column: number
  columns: number
  /** décalage en « cartes posées » (0 ou 1) quand le groupe n'a que deux items */
  nested: number
}

function overlaps(a: Placed, b: Placed): boolean {
  return a.startSlot < b.endSlot && b.startSlot < a.endSlot
}

/** Groupes de collision par union-find, puis affectation de colonnes par groupe. */
export function layoutDay(items: readonly Placed[]): Placement[] {
  const sorted = [...items].sort(
    (a, b) => a.startSlot - b.startSlot || b.endSlot - b.startSlot - (a.endSlot - a.startSlot),
  )
  const parent = sorted.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)))
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b)
  }
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (overlaps(sorted[i]!, sorted[j]!)) union(i, j)
    }
  }

  const groups = new Map<number, number[]>()
  sorted.forEach((_, i) => {
    const root = find(i)
    const list = groups.get(root) ?? []
    list.push(i)
    groups.set(root, list)
  })

  const out: Placement[] = []
  for (const members of groups.values()) {
    if (members.length === 2) {
      const [first, second] = members as [number, number]
      out.push({ id: sorted[first]!.id, column: 0, columns: 1, nested: 0 })
      out.push({ id: sorted[second]!.id, column: 0, columns: 1, nested: 1 })
      continue
    }
    // coloration d'intervalles : première colonne libre
    const columnEnds: number[] = []
    const assigned = new Map<number, number>()
    for (const idx of members) {
      const item = sorted[idx]!
      let col = columnEnds.findIndex((end) => end <= item.startSlot)
      if (col === -1) {
        col = columnEnds.length
        columnEnds.push(item.endSlot)
      } else {
        columnEnds[col] = item.endSlot
      }
      assigned.set(idx, col)
    }
    for (const idx of members) {
      out.push({ id: sorted[idx]!.id, column: assigned.get(idx)!, columns: columnEnds.length, nested: 0 })
    }
  }
  return out
}
