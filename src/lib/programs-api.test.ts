import { describe, expect, it } from 'vitest'
import { getSwapPair } from '@/lib/programs-api'
import type { Block } from '@/lib/programs-api'

function makeBlock(id: string, orderIndex: number): Block {
  return {
    id,
    user_id: 'user-1',
    program_id: 'program-1',
    name: `Block ${id}`,
    focus: 'hypertrophie',
    block_type: 'accumulation',
    order_index: orderIndex,
    duration_weeks: 4,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('getSwapPair', () => {
  const blocks = [makeBlock('a', 0), makeBlock('b', 1), makeBlock('c', 2)]

  it('returns the block and its predecessor when moving up', () => {
    expect(getSwapPair(blocks, 'b', 'up')).toEqual([blocks[1], blocks[0]])
  })

  it('returns the block and its successor when moving down', () => {
    expect(getSwapPair(blocks, 'b', 'down')).toEqual([blocks[1], blocks[2]])
  })

  it('returns null when the first block moves up', () => {
    expect(getSwapPair(blocks, 'a', 'up')).toBeNull()
  })

  it('returns null when the last block moves down', () => {
    expect(getSwapPair(blocks, 'c', 'down')).toBeNull()
  })

  it('returns null for a single-block list in either direction', () => {
    const single = [makeBlock('only', 0)]
    expect(getSwapPair(single, 'only', 'up')).toBeNull()
    expect(getSwapPair(single, 'only', 'down')).toBeNull()
  })

  it('returns null when the block id is not found', () => {
    expect(getSwapPair(blocks, 'missing', 'up')).toBeNull()
  })
})
