import { describe, expect, it } from 'vitest'
import { calculatePlateBreakdown } from '@/lib/plate-calculator'

describe('calculatePlateBreakdown', () => {
  it('splits an exact target evenly per side, largest plates first', () => {
    const result = calculatePlateBreakdown(100, 20)
    expect(result.isExact).toBe(true)
    expect(result.achievedWeightKg).toBe(100)
    // Per side: (100 - 20) / 2 = 40 -> 25 + 15
    expect(result.perSide).toEqual([
      { plateKg: 25, count: 1 },
      { plateKg: 15, count: 1 },
    ])
  })

  it('returns an empty breakdown for the bar alone', () => {
    const result = calculatePlateBreakdown(20, 20)
    expect(result.perSide).toEqual([])
    expect(result.isExact).toBe(true)
    expect(result.achievedWeightKg).toBe(20)
  })

  it('treats a target below the bar weight as bar-only, not negative plates', () => {
    const result = calculatePlateBreakdown(10, 20)
    expect(result.perSide).toEqual([])
    expect(result.achievedWeightKg).toBe(20)
    expect(result.isExact).toBe(false)
  })

  it('uses repeated plates of the same denomination when needed', () => {
    const result = calculatePlateBreakdown(140, 20)
    // Per side: 60 -> 25 + 25 + 10
    expect(result.perSide).toEqual([
      { plateKg: 25, count: 2 },
      { plateKg: 10, count: 1 },
    ])
    expect(result.isExact).toBe(true)
  })

  it('falls back to the closest achievable weight when the target is not reachable', () => {
    // Per side target: 33.4 -> 25 + 5 + 2.5 = 32.5, 0.9 left over (unreachable
    // with 1.25kg granularity) -> achieved total: 20 + 32.5*2 = 85.
    const result = calculatePlateBreakdown(86.8, 20)
    expect(result.isExact).toBe(false)
    expect(result.achievedWeightKg).toBeLessThan(86.8)
    expect(result.achievedWeightKg).toBeCloseTo(85, 5)
  })

  it('respects a custom bar weight (e.g. a 15kg technique bar)', () => {
    const result = calculatePlateBreakdown(55, 15)
    // Per side: 20 -> 20
    expect(result.perSide).toEqual([{ plateKg: 20, count: 1 }])
    expect(result.isExact).toBe(true)
  })

  it('respects a custom, smaller plate set', () => {
    const result = calculatePlateBreakdown(60, 20, [20, 10, 5])
    // Per side: 20 -> 20
    expect(result.perSide).toEqual([{ plateKg: 20, count: 1 }])
    expect(result.isExact).toBe(true)
  })
})
