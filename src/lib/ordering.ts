export interface Ordered {
  id: string
  order_index: number
}

export function nextOrderIndex(items: Ordered[]): number {
  return items.length === 0 ? 0 : Math.max(...items.map((item) => item.order_index)) + 1
}

interface Grouped {
  id: string
  superset_group: string | null
}

// After a drag-and-drop reorder, decides which superset group (if any) the
// moved item now belongs to — inferred from its new neighbors rather than
// tracked as a separate "which group container did you drop it in" concept,
// since groups are just consecutive runs of a shared superset_group value,
// not a real nested structure. Only joins a group when landing strictly
// *between* two members of the same one (both neighbors match) — landing at
// a group's edge (only one matching neighbor) leaves it ungrouped, since
// that's ambiguous ("did they mean to join, or just reorder nearby?") and
// silently absorbing it would be surprising. A brand new group (or adding
// the second member to what's about to become one) still goes through the
// explicit "Superset" text field in the edit dialog — drag only changes
// membership in a group that already has 2+ exercises.
export function inferGroupAfterMove<T extends Grouped>(
  orderedItems: T[],
  movedId: string,
): string | null {
  const index = orderedItems.findIndex((item) => item.id === movedId)
  if (index === -1) return null
  const prev = orderedItems[index - 1]
  const next = orderedItems[index + 1]
  if (prev?.superset_group && prev.superset_group === next?.superset_group) {
    return prev.superset_group
  }
  return null
}
