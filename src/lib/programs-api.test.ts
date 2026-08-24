import { describe, expect, it } from 'vitest'
import {
  applyLoadAdjustment,
  applyRpeAdjustment,
  applyRpeOffset,
  suggestFocusLoadAdjustmentPercent,
  suggestRpeAdjustmentPoints,
} from '@/lib/programs-api'

describe('applyLoadAdjustment', () => {
  it('reduces a positive target weight by the given percentage', () => {
    // 100 * (1 - 15/100) = 85
    expect(applyLoadAdjustment(100, 15)).toBe(85)
  })

  it('rounds to one decimal, matching the column precision', () => {
    // 62.5 * 0.85 = 53.125 -> 53.1
    expect(applyLoadAdjustment(62.5, 15)).toBe(53.1)
  })

  it('increases the weight when given a negative percentage', () => {
    // 62.5 * (1 - -18/100) = 62.5 * 1.18 = 73.75 -> 73.8
    expect(applyLoadAdjustment(62.5, -18)).toBe(73.8)
  })

  it('returns null unchanged', () => {
    expect(applyLoadAdjustment(null, 15)).toBeNull()
  })

  it('leaves a zero adjustment percentage as a no-op', () => {
    expect(applyLoadAdjustment(100, 0)).toBe(100)
  })

  it('does not adjust a negative value (bodyweight assistance, not a load)', () => {
    // -10 means "10kg of machine assistance" — scaling its magnitude either
    // way changes how much help the exercise gets, not a load to cut/raise.
    expect(applyLoadAdjustment(-10, 15)).toBe(-10)
    expect(applyLoadAdjustment(-10, -18)).toBe(-10)
  })

  it('does not adjust zero (bodyweight-only, nothing to cut)', () => {
    expect(applyLoadAdjustment(0, 15)).toBe(0)
  })
})

describe('applyRpeAdjustment', () => {
  it('reduces target RPE by the same percentage as a deload load cut', () => {
    // 10 * (1 - 40/100) = 6, 9 * 0.6 = 5.4 — both land in the well-established
    // deload-week effort range (RPE 4-6).
    expect(applyRpeAdjustment(10, 40)).toBe(6)
    expect(applyRpeAdjustment(9, 40)).toBe(5.4)
  })

  it('increases target RPE when given a negative percentage', () => {
    // 8 * (1 - -18/100) = 8 * 1.18 = 9.44
    expect(applyRpeAdjustment(8, -18)).toBe(9.4)
  })

  it('clamps to the 0-10 scale instead of overshooting', () => {
    expect(applyRpeAdjustment(9, -50)).toBe(10)
    expect(applyRpeAdjustment(1, 200)).toBe(0)
  })

  it('returns null unchanged (never set, nothing to scale)', () => {
    expect(applyRpeAdjustment(null, 40)).toBeNull()
  })

  it('leaves a zero adjustment percentage as a no-op', () => {
    expect(applyRpeAdjustment(7, 0)).toBe(7)
  })
})

describe('suggestFocusLoadAdjustmentPercent', () => {
  it('suggests the destination focus own fixed default, regardless of source', () => {
    expect(suggestFocusLoadAdjustmentPercent('hypertrophie', 'force')).toBe(0)
    expect(suggestFocusLoadAdjustmentPercent('endurance', 'force')).toBe(0)
  })

  it('suggests the hypertrophie default going from force', () => {
    expect(suggestFocusLoadAdjustmentPercent('force', 'hypertrophie')).toBe(20)
  })

  it('suggests the endurance default going from hypertrophie', () => {
    expect(suggestFocusLoadAdjustmentPercent('hypertrophie', 'endurance')).toBe(38)
  })

  it('returns 0 when the focus does not change', () => {
    expect(suggestFocusLoadAdjustmentPercent('hypertrophie', 'hypertrophie')).toBe(0)
  })

  it('returns 0 when either side is deload (its own dedicated mechanism)', () => {
    expect(suggestFocusLoadAdjustmentPercent('deload', 'hypertrophie')).toBe(0)
    expect(suggestFocusLoadAdjustmentPercent('force', 'deload')).toBe(0)
  })
})

describe('applyRpeOffset', () => {
  it('adds a signed point offset to the target RPE', () => {
    expect(applyRpeOffset(9, -1)).toBe(8)
    expect(applyRpeOffset(7, 1)).toBe(8)
  })

  it('clamps to the 0-10 scale', () => {
    expect(applyRpeOffset(9.5, 2)).toBe(10)
    expect(applyRpeOffset(0.5, -2)).toBe(0)
  })

  it('returns null unchanged (never set, nothing to offset)', () => {
    expect(applyRpeOffset(null, -1)).toBeNull()
  })

  it('leaves a zero offset as a no-op', () => {
    expect(applyRpeOffset(7, 0)).toBe(7)
  })
})

describe('suggestRpeAdjustmentPoints', () => {
  it('suggests -1 for a real focus-to-focus change', () => {
    expect(suggestRpeAdjustmentPoints('force', 'hypertrophie')).toBe(-1)
    expect(suggestRpeAdjustmentPoints('hypertrophie', 'endurance')).toBe(-1)
  })

  it('returns 0 when the focus does not change', () => {
    expect(suggestRpeAdjustmentPoints('hypertrophie', 'hypertrophie')).toBe(0)
  })

  it('returns 0 when either side is deload (keeps applyRpeAdjustment instead)', () => {
    expect(suggestRpeAdjustmentPoints('deload', 'hypertrophie')).toBe(0)
    expect(suggestRpeAdjustmentPoints('force', 'deload')).toBe(0)
  })
})
