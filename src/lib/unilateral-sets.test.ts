import { describe, expect, it } from 'vitest'
import { computeNextTarget } from '@/lib/unilateral-sets'

describe('computeNextTarget', () => {
  it('just counts sets for a bilateral exercise, side always "both"', () => {
    expect(computeNextTarget([], false)).toEqual({ setNumber: 1, side: 'both' })
    expect(
      computeNextTarget(
        [
          { set_number: 1, side: 'both' },
          { set_number: 2, side: 'both' },
        ],
        false,
      ),
    ).toEqual({ setNumber: 3, side: 'both' })
  })

  it('starts a unilateral exercise on the left for a fresh set number', () => {
    expect(computeNextTarget([], true)).toEqual({ setNumber: 1, side: 'left' })
  })

  it('asks for the right side once the left side of that set number is logged', () => {
    expect(computeNextTarget([{ set_number: 1, side: 'left' }], true)).toEqual({
      setNumber: 1,
      side: 'right',
    })
  })

  it('moves to the next set number once both sides of the current one are logged', () => {
    expect(
      computeNextTarget(
        [
          { set_number: 1, side: 'left' },
          { set_number: 1, side: 'right' },
        ],
        true,
      ),
    ).toEqual({ setNumber: 2, side: 'left' })
  })

  it('back-fills a missing side from an earlier set number before moving on', () => {
    // Set 1 only got its left side logged, then the user jumped ahead and
    // logged both sides of set 2 — the missing set 1 right side still
    // takes priority over starting set 3.
    expect(
      computeNextTarget(
        [
          { set_number: 1, side: 'left' },
          { set_number: 2, side: 'left' },
          { set_number: 2, side: 'right' },
        ],
        true,
      ),
    ).toEqual({ setNumber: 1, side: 'right' })
  })
})
