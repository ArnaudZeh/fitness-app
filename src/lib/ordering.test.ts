import { describe, expect, it } from 'vitest'
import {
  computeBlocks,
  inferGroupAfterMove,
  linkIntoSuperset,
  nextOrderIndex,
  nextSupersetLabel,
  unlinkFromSuperset,
} from '@/lib/ordering'
import type { Ordered } from '@/lib/ordering'

function makeItem(id: string, orderIndex: number): Ordered {
  return { id, order_index: orderIndex }
}

describe('nextOrderIndex', () => {
  it('returns 0 for an empty list', () => {
    expect(nextOrderIndex([])).toBe(0)
  })

  it('returns one past the current max order_index', () => {
    const items = [makeItem('a', 0), makeItem('b', 3), makeItem('c', 1)]
    expect(nextOrderIndex(items)).toBe(4)
  })
})

function makeGrouped(id: string, supersetGroup: string | null) {
  return { id, superset_group: supersetGroup }
}

describe('inferGroupAfterMove', () => {
  it('joins a group when dropped strictly between two of its members', () => {
    const items = [
      makeGrouped('x', null),
      makeGrouped('a1', 'A'),
      makeGrouped('moved', null),
      makeGrouped('a2', 'A'),
    ]
    expect(inferGroupAfterMove(items, 'moved')).toBe('A')
  })

  it('does not join when only the preceding neighbor matches (landed at the edge)', () => {
    const items = [makeGrouped('a1', 'A'), makeGrouped('a2', 'A'), makeGrouped('moved', null)]
    expect(inferGroupAfterMove(items, 'moved')).toBeNull()
  })

  it('does not join when only the following neighbor matches (landed at the edge)', () => {
    const items = [makeGrouped('moved', null), makeGrouped('a1', 'A'), makeGrouped('a2', 'A')]
    expect(inferGroupAfterMove(items, 'moved')).toBeNull()
  })

  it('leaves the item ungrouped when dropped among ungrouped items', () => {
    const items = [makeGrouped('x', null), makeGrouped('moved', null), makeGrouped('y', null)]
    expect(inferGroupAfterMove(items, 'moved')).toBeNull()
  })

  it('switches from one group to another when dropped inside it', () => {
    const items = [
      makeGrouped('b1', 'B'),
      makeGrouped('a1', 'A'),
      makeGrouped('moved', 'B'),
      makeGrouped('a2', 'A'),
    ]
    expect(inferGroupAfterMove(items, 'moved')).toBe('A')
  })

  it('leaves a lone item at either end of the list ungrouped', () => {
    const items = [makeGrouped('moved', null), makeGrouped('a1', 'A')]
    expect(inferGroupAfterMove(items, 'moved')).toBeNull()
  })

  it('returns null when the id is not found', () => {
    expect(inferGroupAfterMove([makeGrouped('a', 'A')], 'missing')).toBeNull()
  })
})

describe('computeBlocks', () => {
  it('returns a single block for one ungrouped item', () => {
    const blocks = computeBlocks([makeGrouped('a', null)])
    expect(blocks).toEqual([{ kind: 'single', slot: makeGrouped('a', null) }])
  })

  it('groups consecutive items sharing the same label into one block', () => {
    const items = [
      makeGrouped('x', null),
      makeGrouped('a1', 'A'),
      makeGrouped('a2', 'A'),
      makeGrouped('y', null),
    ]
    expect(computeBlocks(items)).toEqual([
      { kind: 'single', slot: items[0] },
      { kind: 'group', group: 'A', slots: [items[1], items[2]] },
      { kind: 'single', slot: items[3] },
    ])
  })

  it('splits into separate blocks when the same label is not contiguous', () => {
    const items = [makeGrouped('a1', 'A'), makeGrouped('x', null), makeGrouped('a2', 'A')]
    expect(computeBlocks(items)).toEqual([
      { kind: 'group', group: 'A', slots: [items[0]] },
      { kind: 'single', slot: items[1] },
      { kind: 'group', group: 'A', slots: [items[2]] },
    ])
  })

  it('returns an empty array for an empty list', () => {
    expect(computeBlocks([])).toEqual([])
  })
})

describe('nextSupersetLabel', () => {
  it('returns A when there are no existing groups', () => {
    expect(nextSupersetLabel([])).toBe('A')
    expect(nextSupersetLabel([null, null])).toBe('A')
  })

  it('skips letters already in use', () => {
    expect(nextSupersetLabel(['A'])).toBe('B')
    expect(nextSupersetLabel(['B', 'A'])).toBe('C')
  })

  it('finds the first gap rather than always appending', () => {
    expect(nextSupersetLabel(['A', 'C'])).toBe('B')
  })
})

describe('linkIntoSuperset', () => {
  it('creates a brand new group when linking two single exercises, placed adjacently', () => {
    const items = [makeGrouped('a', null), makeGrouped('b', null), makeGrouped('c', null)]
    const result = linkIntoSuperset(items, items[0]!, { kind: 'single', slot: items[2]! })
    // 'a' (moved) now sits right after 'c' (its new groupmate); 'b' is
    // unaffected and keeps its relative position.
    expect(result.map((s) => s.id)).toEqual(['b', 'c', 'a'])
    expect(result.find((s) => s.id === 'a')?.superset_group).toBe('A')
    expect(result.find((s) => s.id === 'c')?.superset_group).toBe('A')
    expect(result.find((s) => s.id === 'b')?.superset_group).toBeNull()
  })

  it('picks a label that skips groups already in use', () => {
    const items = [makeGrouped('a1', 'A'), makeGrouped('a2', 'A'), makeGrouped('x', null), makeGrouped('y', null)]
    const result = linkIntoSuperset(items, items[2]!, { kind: 'single', slot: items[3]! })
    expect(result.find((s) => s.id === 'x')?.superset_group).toBe('B')
    expect(result.find((s) => s.id === 'y')?.superset_group).toBe('B')
  })

  it('joins an existing group, placed right after its last member', () => {
    const items = [
      makeGrouped('a1', 'A'),
      makeGrouped('a2', 'A'),
      makeGrouped('x', null),
      makeGrouped('y', null),
    ]
    const result = linkIntoSuperset(items, items[3]!, {
      kind: 'group',
      group: 'A',
      slots: [items[0]!, items[1]!],
    })
    expect(result.map((s) => s.id)).toEqual(['a1', 'a2', 'y', 'x'])
    expect(result.find((s) => s.id === 'y')?.superset_group).toBe('A')
  })
})

describe('unlinkFromSuperset', () => {
  it('removes the slot from its group, leaving the rest of a 3+ group intact', () => {
    const items = [makeGrouped('a1', 'A'), makeGrouped('a2', 'A'), makeGrouped('a3', 'A')]
    const result = unlinkFromSuperset(items, 'a2')
    expect(result.find((s) => s.id === 'a1')?.superset_group).toBe('A')
    expect(result.find((s) => s.id === 'a2')?.superset_group).toBeNull()
    expect(result.find((s) => s.id === 'a3')?.superset_group).toBe('A')
  })

  it('dissolves the group entirely when only one member would remain', () => {
    const items = [makeGrouped('a1', 'A'), makeGrouped('a2', 'A'), makeGrouped('x', null)]
    const result = unlinkFromSuperset(items, 'a1')
    expect(result.find((s) => s.id === 'a1')?.superset_group).toBeNull()
    expect(result.find((s) => s.id === 'a2')?.superset_group).toBeNull()
  })

  it('is a no-op for an already-ungrouped slot', () => {
    const items = [makeGrouped('x', null), makeGrouped('a1', 'A'), makeGrouped('a2', 'A')]
    const result = unlinkFromSuperset(items, 'x')
    expect(result).toEqual(items)
  })
})
