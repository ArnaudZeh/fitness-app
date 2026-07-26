import { describe, expect, it } from 'vitest'
import { inferGroupAfterMove, nextOrderIndex } from '@/lib/ordering'
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
