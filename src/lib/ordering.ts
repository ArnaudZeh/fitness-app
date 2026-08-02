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

// Groups are just consecutive runs sharing the same superset_group value —
// not a real nested structure. Shared between the program-editing view
// (SessionTemplateCard), the linking dialog, and the in-session log view so
// all three render/reason about the same "run of matching labels" concept.
export type SlotBlock<T> =
  | { kind: 'group'; group: string; slots: T[] }
  | { kind: 'single'; slot: T }

export function computeBlocks<T extends Grouped>(slots: T[]): SlotBlock<T>[] {
  const blocks: SlotBlock<T>[] = []
  let i = 0
  while (i < slots.length) {
    const slot = slots[i]
    if (!slot) break
    if (slot.superset_group) {
      const group = slot.superset_group
      const groupSlots = [slot]
      let j = i + 1
      while (slots[j]?.superset_group === group) {
        groupSlots.push(slots[j]!)
        j++
      }
      blocks.push({ kind: 'group', group, slots: groupSlots })
      i = j
    } else {
      blocks.push({ kind: 'single', slot })
      i++
    }
  }
  return blocks
}

// Picks the next free single-letter label (A, B, C…) for a brand new
// superset — used both by the multi-exercise add flow and by linking two
// already-added exercises together, so neither path requires the user to
// type/remember a label themselves. 26 concurrent supersets in one day is
// well past any realistic program, so the numeric fallback past Z is just a
// safety net, not a designed-for case.
export function nextSupersetLabel(existingGroups: (string | null)[]): string {
  const used = new Set(existingGroups.filter((group): group is string => group !== null))
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode('A'.charCodeAt(0) + i)
    if (!used.has(letter)) return letter
  }
  return `G${used.size + 1}`
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
// explicit "Créer un superset" multi-add flow or the per-slot "Lier en
// superset" action — drag only changes membership in a group that already
// has 2+ exercises.
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

// The deliberate, explicit counterpart to drag-and-drop reordering (which
// only ever *joins* a group that already has 2+ members, see above): picks
// either another single exercise (forming a brand new group) or an existing
// group (joining it) as the link target, moves `currentSlot` to sit
// directly after it so the run stays contiguous — computeBlocks only
// renders contiguous same-label runs as one visual group — and returns the
// full day's slots in their new order for a single reorder-and-persist call.
export type LinkTarget<T> = { kind: 'single'; slot: T } | { kind: 'group'; group: string; slots: T[] }

export function linkIntoSuperset<T extends Grouped>(
  daySlots: T[],
  currentSlot: T,
  target: LinkTarget<T>,
): T[] {
  const withoutCurrent = daySlots.filter((slot) => slot.id !== currentSlot.id)

  if (target.kind === 'single') {
    const group = nextSupersetLabel(daySlots.map((slot) => slot.superset_group))
    const targetIndex = withoutCurrent.findIndex((slot) => slot.id === target.slot.id)
    const result = [...withoutCurrent]
    result[targetIndex] = { ...target.slot, superset_group: group }
    result.splice(targetIndex + 1, 0, { ...currentSlot, superset_group: group })
    return result
  }

  const memberIndexes = target.slots.map((slot) =>
    withoutCurrent.findIndex((existing) => existing.id === slot.id),
  )
  const lastMemberIndex = Math.max(...memberIndexes)
  const result = [...withoutCurrent]
  result.splice(lastMemberIndex + 1, 0, { ...currentSlot, superset_group: target.group })
  return result
}

// Removes one slot from its superset. A "group" of one exercise isn't a
// superset anymore, so if this leaves exactly one other member behind, that
// last member is dissolved back to ungrouped too rather than left stranded
// alone under a group label.
export function unlinkFromSuperset<T extends Grouped>(daySlots: T[], slotId: string): T[] {
  const group = daySlots.find((slot) => slot.id === slotId)?.superset_group ?? null
  if (!group) return daySlots

  const otherMembers = daySlots.filter((slot) => slot.superset_group === group && slot.id !== slotId)
  const shouldDissolve = otherMembers.length === 1
  const lastMemberId = shouldDissolve ? otherMembers[0]!.id : null

  return daySlots.map((slot) => {
    if (slot.id === slotId || slot.id === lastMemberId) {
      return { ...slot, superset_group: null }
    }
    return slot
  })
}
