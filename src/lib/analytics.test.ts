import { describe, expect, it } from 'vitest'
import {
  buildTrendSummary,
  computeDailyVolume,
  computeOneRepMaxProgression,
  computeWeeklyTonnage,
  computeWeeklyTonnageProgress,
  computeWeightGoalProgress,
  countCompletedSessionsThisWeek,
  countTrainingDaysThisWeek,
  getCompletedSessionDates,
  getLoggedExercises,
} from '@/lib/analytics'
import type { SetHistoryRecord } from '@/lib/analytics-api'

function makeRecord(overrides: Partial<SetHistoryRecord> = {}): SetHistoryRecord {
  return {
    id: 'set-1',
    exerciseId: 'ex-squat',
    exerciseName: 'Squat',
    muscleGroup: 'jambes',
    imageUrl: null,
    weightKg: 100,
    reps: 8,
    rpe: null,
    loggedAt: '2026-07-20',
    ...overrides,
  }
}

describe('getLoggedExercises', () => {
  it('returns unique exercises sorted alphabetically', () => {
    const records = [
      makeRecord({ exerciseId: 'ex-squat', exerciseName: 'Squat' }),
      makeRecord({ exerciseId: 'ex-bench', exerciseName: 'Bench Press' }),
      makeRecord({ exerciseId: 'ex-squat', exerciseName: 'Squat' }),
    ]
    expect(getLoggedExercises(records)).toEqual([
      { exerciseId: 'ex-bench', exerciseName: 'Bench Press', imageUrl: null },
      { exerciseId: 'ex-squat', exerciseName: 'Squat', imageUrl: null },
    ])
  })

  it('returns an empty list for no history', () => {
    expect(getLoggedExercises([])).toEqual([])
  })
})

describe('computeOneRepMaxProgression', () => {
  it('takes the best estimated 1RM per day, ignoring other exercises', () => {
    const records = [
      makeRecord({ loggedAt: '2026-07-20', weightKg: 100, reps: 8 }),
      makeRecord({ loggedAt: '2026-07-20', weightKg: 110, reps: 5 }),
      makeRecord({
        loggedAt: '2026-07-20',
        exerciseId: 'ex-bench',
        weightKg: 999,
        reps: 1,
      }),
      makeRecord({ loggedAt: '2026-07-27', weightKg: 105, reps: 6 }),
    ]
    const result = computeOneRepMaxProgression(records, 'ex-squat')
    expect(result).toHaveLength(2)
    expect(result[0]?.date).toBe('2026-07-20')
    expect(result[1]?.date).toBe('2026-07-27')
    // 110kg x 5 reps should beat 100kg x 8 reps for that day's best estimate.
    expect(result[0]?.maxWeightKg).toBe(110)
  })

  it('still reports max weight lifted when reps are outside the reliable 1RM range', () => {
    const records = [makeRecord({ weightKg: 40, reps: 20 })]
    const result = computeOneRepMaxProgression(records, 'ex-squat')
    expect(result[0]?.estimatedOneRepMaxKg).toBeNull()
    expect(result[0]?.maxWeightKg).toBe(40)
  })

  it('sorts by date ascending', () => {
    const records = [
      makeRecord({ loggedAt: '2026-08-01' }),
      makeRecord({ loggedAt: '2026-07-01' }),
      makeRecord({ loggedAt: '2026-07-15' }),
    ]
    const result = computeOneRepMaxProgression(records, 'ex-squat')
    expect(result.map((r) => r.date)).toEqual(['2026-07-01', '2026-07-15', '2026-08-01'])
  })

  it('returns an empty array for an exercise with no history', () => {
    expect(computeOneRepMaxProgression([makeRecord()], 'ex-unknown')).toEqual([])
  })
})

describe('computeWeeklyTonnage', () => {
  it('sums weight x reps per ISO week across all exercises', () => {
    const records = [
      // Monday 2026-07-20 and Wednesday 2026-07-22 — same ISO week.
      makeRecord({ loggedAt: '2026-07-20', weightKg: 100, reps: 8 }),
      makeRecord({
        loggedAt: '2026-07-22',
        exerciseId: 'ex-bench',
        weightKg: 80,
        reps: 10,
      }),
      // Next week.
      makeRecord({ loggedAt: '2026-07-27', weightKg: 100, reps: 5 }),
    ]
    const result = computeWeeklyTonnage(records)
    expect(result).toHaveLength(2)
    expect(result[0]?.weekStart).toBe('2026-07-20')
    expect(result[0]?.tonnageKg).toBe(100 * 8 + 80 * 10)
    expect(result[1]?.weekStart).toBe('2026-07-27')
    expect(result[1]?.tonnageKg).toBe(100 * 5)
  })

  it('buckets a Sunday into the ISO week that started the preceding Monday', () => {
    // 2026-07-26 is a Sunday; its ISO week starts Monday 2026-07-20.
    const records = [makeRecord({ loggedAt: '2026-07-26', weightKg: 50, reps: 10 })]
    const result = computeWeeklyTonnage(records)
    expect(result[0]?.weekStart).toBe('2026-07-20')
  })
})

describe('computeDailyVolume', () => {
  it('sums tonnage per day across exercises, sparse otherwise', () => {
    const records = [
      makeRecord({ loggedAt: '2026-07-20', weightKg: 100, reps: 8 }),
      makeRecord({
        loggedAt: '2026-07-20',
        exerciseId: 'ex-bench',
        weightKg: 80,
        reps: 10,
      }),
      makeRecord({ loggedAt: '2026-07-21', weightKg: 50, reps: 10 }),
    ]
    const result = computeDailyVolume(records)
    expect(result.get('2026-07-20')).toBe(100 * 8 + 80 * 10)
    expect(result.get('2026-07-21')).toBe(50 * 10)
    expect(result.has('2026-07-22')).toBe(false)
  })
})

describe('countTrainingDaysThisWeek', () => {
  it('counts distinct days within the current ISO week only', () => {
    const now = new Date('2026-07-22T12:00:00Z') // Wednesday, week of 2026-07-20
    const records = [
      makeRecord({ loggedAt: '2026-07-20' }),
      makeRecord({ loggedAt: '2026-07-20', exerciseId: 'ex-bench' }), // same day, doesn't double-count
      makeRecord({ loggedAt: '2026-07-22' }),
      makeRecord({ loggedAt: '2026-07-13' }), // previous week, excluded
    ]
    expect(countTrainingDaysThisWeek(records, now)).toBe(2)
  })

  it('returns 0 when nothing was logged this week', () => {
    const now = new Date('2026-07-22T12:00:00Z')
    expect(countTrainingDaysThisWeek([makeRecord({ loggedAt: '2026-07-13' })], now)).toBe(
      0,
    )
  })
})

describe('countCompletedSessionsThisWeek', () => {
  // Built from local Date constructors (not UTC 'Z' strings) so the test
  // stays correct regardless of which timezone it runs in — toISOString()
  // round-trips back to the same local calendar day via toLocalDateString.
  it('counts distinct local days with a completed session, ignoring status and previous weeks', () => {
    const now = new Date(2026, 6, 22, 12, 0, 0) // Wednesday 2026-07-22, week of 2026-07-20
    const logs = [
      { status: 'completed', started_at: new Date(2026, 6, 20, 9, 0, 0).toISOString() },
      { status: 'in_progress', started_at: new Date(2026, 6, 21, 9, 0, 0).toISOString() },
      { status: 'completed', started_at: new Date(2026, 6, 22, 9, 0, 0).toISOString() },
      { status: 'completed', started_at: new Date(2026, 6, 13, 9, 0, 0).toISOString() },
    ]
    expect(countCompletedSessionsThisWeek(logs, now)).toBe(2)
  })

  it('counts a completed session even with zero sets logged in it', () => {
    const now = new Date(2026, 6, 22, 12, 0, 0)
    const logs = [
      { status: 'completed', started_at: new Date(2026, 6, 22, 9, 0, 0).toISOString() },
    ]
    expect(countCompletedSessionsThisWeek(logs, now)).toBe(1)
  })

  it('returns 0 when nothing was completed this week', () => {
    const now = new Date(2026, 6, 22, 12, 0, 0)
    const logs = [
      { status: 'completed', started_at: new Date(2026, 6, 13, 9, 0, 0).toISOString() },
    ]
    expect(countCompletedSessionsThisWeek(logs, now)).toBe(0)
  })
})

describe('getCompletedSessionDates', () => {
  it('returns the local date of every completed log, unbounded by week', () => {
    const logs = [
      { status: 'completed', started_at: new Date(2026, 6, 13, 9, 0, 0).toISOString() },
      { status: 'completed', started_at: new Date(2026, 6, 22, 9, 0, 0).toISOString() },
    ]
    expect(getCompletedSessionDates(logs)).toEqual(new Set(['2026-07-13', '2026-07-22']))
  })

  it('excludes logs that are not completed', () => {
    const logs = [
      { status: 'in_progress', started_at: new Date(2026, 6, 22, 9, 0, 0).toISOString() },
    ]
    expect(getCompletedSessionDates(logs)).toEqual(new Set())
  })
})

describe('buildTrendSummary', () => {
  const now = new Date('2026-07-22T12:00:00Z') // Wednesday, week of 2026-07-20

  it('handles no history at all', () => {
    const summary = buildTrendSummary([], now)
    expect(summary.weeklyTonnage).toEqual([])
    expect(summary.trainingDaysThisWeek).toBe(0)
    expect(summary.totalSetsInWindow).toBe(0)
    expect(summary.exercises).toEqual([])
  })

  it('picks the most frequently logged exercises, most-frequent first', () => {
    const records = [
      makeRecord({ exerciseId: 'ex-squat', exerciseName: 'Squat', loggedAt: '2026-07-20' }),
      makeRecord({ exerciseId: 'ex-squat', exerciseName: 'Squat', loggedAt: '2026-07-20' }),
      makeRecord({ exerciseId: 'ex-squat', exerciseName: 'Squat', loggedAt: '2026-07-21' }),
      makeRecord({ exerciseId: 'ex-bench', exerciseName: 'Bench Press', loggedAt: '2026-07-21' }),
    ]
    const summary = buildTrendSummary(records, now)
    expect(summary.exercises.map((e) => e.exerciseName)).toEqual(['Squat', 'Bench Press'])
    expect(summary.totalSetsInWindow).toBe(4)
  })

  it('excludes sets older than the 8-week tonnage window from the exercise frequency count', () => {
    const records = [
      // 10 weeks ago — outside the window.
      makeRecord({
        exerciseId: 'ex-old',
        exerciseName: 'Old Exercise',
        loggedAt: '2026-05-11',
      }),
      makeRecord({ exerciseId: 'ex-squat', exerciseName: 'Squat', loggedAt: '2026-07-20' }),
    ]
    const summary = buildTrendSummary(records, now)
    expect(summary.exercises.map((e) => e.exerciseName)).toEqual(['Squat'])
  })

  it('caps at 5 exercises and 6 progression points per exercise', () => {
    const records: SetHistoryRecord[] = []
    for (let i = 0; i < 8; i++) {
      records.push(
        makeRecord({ exerciseId: `ex-${i}`, exerciseName: `Exercise ${i}`, loggedAt: '2026-07-20' }),
      )
    }
    for (let i = 0; i < 10; i++) {
      records.push(
        makeRecord({
          exerciseId: 'ex-frequent',
          exerciseName: 'Frequent',
          loggedAt: `2026-07-${String(13 + i).padStart(2, '0')}`,
        }),
      )
    }
    const summary = buildTrendSummary(records, now)
    expect(summary.exercises).toHaveLength(5)
    const frequent = summary.exercises.find((e) => e.exerciseName === 'Frequent')
    expect(frequent?.recentPoints.length).toBeLessThanOrEqual(6)
  })
})

describe('computeWeeklyTonnageProgress', () => {
  const now = new Date('2026-07-22T12:00:00Z') // Wednesday, week of 2026-07-20

  it('returns a null ratio when there is neither a prior week nor anything logged this week', () => {
    const result = computeWeeklyTonnageProgress([], new Set(), now)
    expect(result.ratio).toBeNull()
    expect(result.lastWeekTonnageKg).toBeNull()
    expect(result.thisWeekTonnageKg).toBe(0)
    expect(result.lastWeekHadSessions).toBe(false)
  })

  it('fully fills the ring when there is tonnage this week but no prior-week baseline', () => {
    // Matches a completed-but-empty prior session too, not just a totally
    // blank prior week — either way there's no real number to divide by, so
    // any tonnage this week already clears that non-existent bar instead of
    // leaving the ring empty despite a real number to show.
    const records = [makeRecord({ loggedAt: '2026-07-21', weightKg: 100, reps: 8 })]
    const result = computeWeeklyTonnageProgress(records, new Set(), now)
    expect(result.ratio).toBe(1)
    expect(result.lastWeekTonnageKg).toBeNull()
    expect(result.thisWeekTonnageKg).toBe(800)
  })

  it('flags lastWeekHadSessions when a session was completed last week despite logging no sets', () => {
    // The exact scenario that looked like a bug: 3 sessions completed last
    // week (2026-07-13 to 07-19), none of them with any set logged — the
    // popup needs to say "no tonnage logged", not "nothing happened".
    const completedSessionDates = new Set(['2026-07-14', '2026-07-16', '2026-07-18'])
    const records = [makeRecord({ loggedAt: '2026-07-21', weightKg: 100, reps: 8 })]
    const result = computeWeeklyTonnageProgress(records, completedSessionDates, now)
    expect(result.lastWeekTonnageKg).toBeNull()
    expect(result.lastWeekHadSessions).toBe(true)
  })

  it('leaves lastWeekHadSessions false when the prior week was genuinely empty', () => {
    const completedSessionDates = new Set(['2026-07-21']) // this week, not last week
    const result = computeWeeklyTonnageProgress([], completedSessionDates, now)
    expect(result.lastWeekHadSessions).toBe(false)
  })

  it('computes the ratio of this week\'s tonnage against last week\'s', () => {
    const records = [
      makeRecord({ loggedAt: '2026-07-14', weightKg: 100, reps: 10 }), // prior week: 1000
      makeRecord({ loggedAt: '2026-07-21', weightKg: 100, reps: 5 }), // this week: 500
    ]
    const result = computeWeeklyTonnageProgress(records, new Set(), now)
    expect(result.lastWeekTonnageKg).toBe(1000)
    expect(result.thisWeekTonnageKg).toBe(500)
    expect(result.ratio).toBe(0.5)
  })

  it('caps the ratio at 1 when this week already beats last week', () => {
    const records = [
      makeRecord({ loggedAt: '2026-07-14', weightKg: 100, reps: 5 }), // prior week: 500
      makeRecord({ loggedAt: '2026-07-21', weightKg: 100, reps: 10 }), // this week: 1000
    ]
    const result = computeWeeklyTonnageProgress(records, new Set(), now)
    expect(result.ratio).toBe(1)
  })

  it('returns a ratio of 0 when last week had volume but nothing is logged yet this week', () => {
    const records = [makeRecord({ loggedAt: '2026-07-14', weightKg: 100, reps: 10 })]
    const result = computeWeeklyTonnageProgress(records, new Set(), now)
    expect(result.thisWeekTonnageKg).toBe(0)
    expect(result.ratio).toBe(0)
  })
})

describe('computeWeightGoalProgress', () => {
  it('returns a null ratio when there are no entries', () => {
    expect(computeWeightGoalProgress([], 85).ratio).toBeNull()
  })

  it('returns a null ratio when no target weight is set', () => {
    const entries = [{ weight_kg: 87.5, recorded_at: '2026-07-22' }]
    expect(computeWeightGoalProgress(entries, null).ratio).toBeNull()
  })

  it('computes progress toward a weight-loss goal from the oldest entry to the newest', () => {
    // entries sorted newest-first, as fetchWeightEntries returns them
    const entries = [
      { weight_kg: 87.5, recorded_at: '2026-07-22' }, // current
      { weight_kg: 88.8, recorded_at: '2026-07-15' },
      { weight_kg: 90, recorded_at: '2026-07-01' }, // oldest = start
    ]
    // (90 - 87.5) / (90 - 85) = 0.5
    expect(computeWeightGoalProgress(entries, 85).ratio).toBe(0.5)
  })

  it('computes progress toward a weight-gain goal the same way', () => {
    const entries = [
      { weight_kg: 72, recorded_at: '2026-07-22' },
      { weight_kg: 70, recorded_at: '2026-07-01' }, // start
    ]
    // (70 - 72) / (70 - 75) = 0.4
    expect(computeWeightGoalProgress(entries, 75).ratio).toBe(0.4)
  })

  it('clamps the ratio to [0, 1] instead of overshooting or going negative', () => {
    const overshoot = [
      { weight_kg: 80, recorded_at: '2026-07-22' },
      { weight_kg: 90, recorded_at: '2026-07-01' },
    ]
    expect(computeWeightGoalProgress(overshoot, 85).ratio).toBe(1)

    const wrongDirection = [
      { weight_kg: 92, recorded_at: '2026-07-22' },
      { weight_kg: 90, recorded_at: '2026-07-01' },
    ]
    expect(computeWeightGoalProgress(wrongDirection, 85).ratio).toBe(0)
  })

  it('treats a start weight already at target as fully met only once actually there', () => {
    const atTarget = [{ weight_kg: 85, recorded_at: '2026-07-22' }]
    expect(computeWeightGoalProgress(atTarget, 85).ratio).toBe(1)
  })
})
