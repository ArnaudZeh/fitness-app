import { describe, expect, it } from 'vitest'
import { computeCyclePhase, estimateCycleLengthDays } from '@/lib/cycle-phase'

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

describe('estimateCycleLengthDays', () => {
  it('defaults to 28 days with fewer than two entries', () => {
    expect(estimateCycleLengthDays([])).toBe(28)
    expect(estimateCycleLengthDays(['2026-01-01'])).toBe(28)
  })

  it('returns the single gap between two entries', () => {
    const first = '2026-01-01'
    const second = addDays(first, 30)
    expect(estimateCycleLengthDays([first, second])).toBe(30)
  })

  it('averages multiple gaps', () => {
    const first = '2026-01-01'
    const second = addDays(first, 28)
    const third = addDays(second, 32)
    expect(estimateCycleLengthDays([first, second, third])).toBe(30)
  })
})

describe('computeCyclePhase', () => {
  it('returns null with no entries', () => {
    expect(computeCyclePhase([], '2026-01-15')).toBeNull()
  })

  it('is menstruelle on the start day itself, with a single entry (28-day default)', () => {
    const start = '2026-01-01'
    const result = computeCyclePhase([start], start)
    expect(result).toEqual({ phase: 'menstruelle', cycleDay: 1, cycleLengthDays: 28 })
  })

  it('stays menstruelle through day 5', () => {
    const start = '2026-01-01'
    const result = computeCyclePhase([start], addDays(start, 4))
    expect(result?.phase).toBe('menstruelle')
    expect(result?.cycleDay).toBe(5)
  })

  it('moves to folliculaire on day 6', () => {
    const start = '2026-01-01'
    const result = computeCyclePhase([start], addDays(start, 5))
    expect(result?.phase).toBe('folliculaire')
    expect(result?.cycleDay).toBe(6)
  })

  it('is ovulation around the estimated ovulation window (28-day cycle)', () => {
    const start = '2026-01-01'
    const result = computeCyclePhase([start], addDays(start, 13))
    expect(result?.phase).toBe('ovulation')
    expect(result?.cycleDay).toBe(14)
  })

  it('is luteale after the ovulation window', () => {
    const start = '2026-01-01'
    const result = computeCyclePhase([start], addDays(start, 20))
    expect(result?.phase).toBe('luteale')
    expect(result?.cycleDay).toBe(21)
  })

  it('wraps the cycle day when no new entry has been logged past the estimated length', () => {
    const start = '2026-01-01'
    // 40 days in, single entry → 28-day estimate: cycleDay = (40 % 28) + 1 = 13.
    const result = computeCyclePhase([start], addDays(start, 40))
    expect(result?.cycleDay).toBe(13)
    expect(result?.phase).toBe('ovulation')
  })

  it('uses the estimated cycle length from history rather than the default', () => {
    const first = '2026-01-01'
    const second = addDays(first, 30)
    const result = computeCyclePhase([first, second], addDays(second, 0))
    expect(result?.cycleLengthDays).toBe(30)
    expect(result?.cycleDay).toBe(1)
    expect(result?.phase).toBe('menstruelle')
  })
})
