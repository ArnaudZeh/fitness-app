import { describe, expect, it } from 'vitest'
import { getSwapPair, nextOrderIndex } from '@/lib/ordering'
import type { Ordered } from '@/lib/ordering'

function makeItem(id: string, orderIndex: number): Ordered {
  return { id, order_index: orderIndex }
}

describe('getSwapPair', () => {
  const items = [makeItem('a', 0), makeItem('b', 1), makeItem('c', 2)]

  it('returns the item and its predecessor when moving up', () => {
    expect(getSwapPair(items, 'b', 'up')).toEqual([items[1], items[0]])
  })

  it('returns the item and its successor when moving down', () => {
    expect(getSwapPair(items, 'b', 'down')).toEqual([items[1], items[2]])
  })

  it('returns null when the first item moves up', () => {
    expect(getSwapPair(items, 'a', 'up')).toBeNull()
  })

  it('returns null when the last item moves down', () => {
    expect(getSwapPair(items, 'c', 'down')).toBeNull()
  })

  it('returns null for a single-item list in either direction', () => {
    const single = [makeItem('only', 0)]
    expect(getSwapPair(single, 'only', 'up')).toBeNull()
    expect(getSwapPair(single, 'only', 'down')).toBeNull()
  })

  it('returns null when the id is not found', () => {
    expect(getSwapPair(items, 'missing', 'up')).toBeNull()
  })
})

describe('nextOrderIndex', () => {
  it('returns 0 for an empty list', () => {
    expect(nextOrderIndex([])).toBe(0)
  })

  it('returns one past the current max order_index', () => {
    const items = [makeItem('a', 0), makeItem('b', 3), makeItem('c', 1)]
    expect(nextOrderIndex(items)).toBe(4)
  })
})
