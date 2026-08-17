import { describe, expect, it } from 'vitest'
import { applyLoadReduction } from '@/lib/programs-api'

describe('applyLoadReduction', () => {
  it('reduces a positive target weight by the given percentage', () => {
    // 100 * (1 - 15/100) = 85
    expect(applyLoadReduction(100, 15)).toBe(85)
  })

  it('rounds to one decimal, matching the column precision', () => {
    // 62.5 * 0.85 = 53.125 -> 53.1
    expect(applyLoadReduction(62.5, 15)).toBe(53.1)
  })

  it('returns null unchanged', () => {
    expect(applyLoadReduction(null, 15)).toBeNull()
  })

  it('leaves a zero reduction percentage as a no-op', () => {
    expect(applyLoadReduction(100, 0)).toBe(100)
  })

  it('does not reduce a negative value (bodyweight assistance, not a load)', () => {
    // -10 means "10kg of machine assistance" — scaling its magnitude down
    // would mean LESS assistance, i.e. a HARDER exercise, the opposite of
    // a deload.
    expect(applyLoadReduction(-10, 15)).toBe(-10)
  })

  it('does not reduce zero (bodyweight-only, nothing to cut)', () => {
    expect(applyLoadReduction(0, 15)).toBe(0)
  })
})
