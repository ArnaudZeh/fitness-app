import { describe, expect, it } from 'vitest'
import {
  estimateOneRepMax,
  estimateOneRepMaxBrzycki,
  estimateOneRepMaxEpley,
} from '@/lib/one-rep-max'

describe('estimateOneRepMaxEpley', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimateOneRepMaxEpley(100, 1)).toBeCloseTo(103.33, 1)
  })

  it('estimates a higher 1RM as reps increase', () => {
    expect(estimateOneRepMaxEpley(100, 8)).toBeCloseTo(126.67, 1)
  })
})

describe('estimateOneRepMaxBrzycki', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimateOneRepMaxBrzycki(100, 1)).toBeCloseTo(100, 1)
  })

  it('estimates a higher 1RM as reps increase', () => {
    expect(estimateOneRepMaxBrzycki(100, 8)).toBeCloseTo(124.14, 1)
  })
})

describe('estimateOneRepMax', () => {
  it('averages both formulas', () => {
    const result = estimateOneRepMax(100, 8)
    expect(result).not.toBeNull()
    expect(result?.epleyKg).toBeCloseTo(126.67, 1)
    expect(result?.brzyckiKg).toBeCloseTo(124.14, 1)
    expect(result?.averageKg).toBeCloseTo((126.67 + 124.14) / 2, 1)
  })

  it('returns null beyond the reliable rep range', () => {
    expect(estimateOneRepMax(60, 20)).toBeNull()
  })

  it('returns null for zero reps', () => {
    expect(estimateOneRepMax(60, 0)).toBeNull()
  })

  it('returns null for a non-positive weight', () => {
    expect(estimateOneRepMax(0, 5)).toBeNull()
  })

  it('accepts the upper edge of the reliable rep range', () => {
    expect(estimateOneRepMax(60, 12)).not.toBeNull()
  })
})
