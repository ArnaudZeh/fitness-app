import { describe, expect, it } from 'vitest'
import { computeProgramCurrentWeek, getProgramPhase } from '@/lib/program-phase'

describe('computeProgramCurrentWeek', () => {
  it('is week 1 when nothing has been logged yet', () => {
    const counts = new Map<string, number>()
    expect(computeProgramCurrentWeek(['legs', 'push', 'pull'], counts)).toBe(1)
  })

  it('advances once every training day has completed the same number of times', () => {
    const counts = new Map([
      ['legs', 2],
      ['push', 2],
      ['pull', 2],
    ])
    expect(computeProgramCurrentWeek(['legs', 'push', 'pull'], counts)).toBe(3)
  })

  it('stays on the least-advanced day when one was skipped (a missed week absorbed, not skipped)', () => {
    // legs and push have been done twice, pull only once (e.g. a missed
    // pull day) — the program is still "week 2" until pull catches up,
    // not week 3.
    const counts = new Map([
      ['legs', 2],
      ['push', 2],
      ['pull', 1],
    ])
    expect(computeProgramCurrentWeek(['legs', 'push', 'pull'], counts)).toBe(2)
  })

  it('is week 1 for a program with no training days at all', () => {
    expect(computeProgramCurrentWeek([], new Map())).toBe(1)
  })
})

describe('getProgramPhase', () => {
  it('returns Acclimatation for weeks 1-2 of an hypertrophie program', () => {
    expect(getProgramPhase('hypertrophie', 1)).toEqual({
      label: 'Acclimatation',
      rpeMin: 7,
      rpeMax: 8,
      effortLabel: '2-3 reps en réserve',
    })
    expect(getProgramPhase('hypertrophie', 2)?.label).toBe('Acclimatation')
  })

  it('returns Surcharge for weeks 3-4', () => {
    expect(getProgramPhase('hypertrophie', 3)?.label).toBe('Surcharge')
    expect(getProgramPhase('hypertrophie', 4)?.label).toBe('Surcharge')
  })

  it('returns Peak — Overreach for week 5 and beyond, capped indefinitely', () => {
    expect(getProgramPhase('hypertrophie', 5)?.label).toBe('Peak — Overreach')
    expect(getProgramPhase('hypertrophie', 6)?.label).toBe('Peak — Overreach')
    expect(getProgramPhase('hypertrophie', 12)?.label).toBe('Peak — Overreach')
  })

  it('returns a fixed RPE 5-6 range for deload regardless of week', () => {
    expect(getProgramPhase('deload', 1)).toEqual({
      label: 'Deload',
      rpeMin: 5,
      rpeMax: 6,
      effortLabel: 'récupération active',
    })
    expect(getProgramPhase('deload', 6)?.rpeMin).toBe(5)
  })

  it('returns null for force and endurance (no phase system for them yet)', () => {
    expect(getProgramPhase('force', 3)).toBeNull()
    expect(getProgramPhase('endurance', 3)).toBeNull()
  })
})
