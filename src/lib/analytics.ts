import { estimateOneRepMax } from '@/lib/one-rep-max'
import type { SetHistoryRecord } from '@/lib/analytics-api'

export interface ExerciseOption {
  exerciseId: string
  exerciseName: string
  imageUrl: string | null
}

// Unique exercises the user actually has logged history for, alphabetical —
// no point offering an exercise with nothing to chart.
export function getLoggedExercises(records: SetHistoryRecord[]): ExerciseOption[] {
  const byId = new Map<string, ExerciseOption>()
  for (const record of records) {
    if (!byId.has(record.exerciseId)) {
      byId.set(record.exerciseId, {
        exerciseId: record.exerciseId,
        exerciseName: record.exerciseName,
        imageUrl: record.imageUrl,
      })
    }
  }
  return [...byId.values()].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName))
}

export interface DailyExerciseBest {
  date: string
  estimatedOneRepMaxKg: number | null
  maxWeightKg: number
}

// One point per day this exercise was trained: the best (max) estimated 1RM
// among that day's sets within the reliable rep range, and the heaviest
// weight actually lifted regardless of reps (still meaningful even for
// higher-rep sets the 1RM formulas can't be trusted for).
export function computeOneRepMaxProgression(
  records: SetHistoryRecord[],
  exerciseId: string,
): DailyExerciseBest[] {
  const byDate = new Map<string, SetHistoryRecord[]>()
  for (const record of records) {
    if (record.exerciseId !== exerciseId) continue
    const existing = byDate.get(record.loggedAt)
    if (existing) {
      existing.push(record)
    } else {
      byDate.set(record.loggedAt, [record])
    }
  }

  return [...byDate.entries()]
    .map(([date, sets]) => {
      const oneRepMaxes = sets
        .map((set) => estimateOneRepMax(set.weightKg, set.reps)?.averageKg ?? null)
        .filter((value): value is number => value !== null)
      return {
        date,
        estimatedOneRepMaxKg: oneRepMaxes.length > 0 ? Math.max(...oneRepMaxes) : null,
        maxWeightKg: Math.max(...sets.map((set) => set.weightKg)),
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface WeeklyTonnage {
  weekStart: string
  tonnageKg: number
}

export function getIsoWeekStart(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`)
  const isoDayOfWeek = date.getUTCDay() === 0 ? 7 : date.getUTCDay()
  date.setUTCDate(date.getUTCDate() - (isoDayOfWeek - 1))
  return date.toISOString().slice(0, 10)
}

// Total tonnage (Σ weight × reps) per ISO week (Monday start), across every
// exercise — the "tonnage hebdo" the brief calls for.
export function computeWeeklyTonnage(records: SetHistoryRecord[]): WeeklyTonnage[] {
  const byWeek = new Map<string, number>()
  for (const record of records) {
    const weekStart = getIsoWeekStart(record.loggedAt)
    const tonnage = record.weightKg * record.reps
    byWeek.set(weekStart, (byWeek.get(weekStart) ?? 0) + tonnage)
  }
  return [...byWeek.entries()]
    .map(([weekStart, tonnageKg]) => ({ weekStart, tonnageKg }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

// Total tonnage per calendar day, across every exercise — feeds the
// GitHub-style activity heatmap. Sparse: only days with logged sets appear.
export function computeDailyVolume(records: SetHistoryRecord[]): Map<string, number> {
  const byDate = new Map<string, number>()
  for (const record of records) {
    const tonnage = record.weightKg * record.reps
    byDate.set(record.loggedAt, (byDate.get(record.loggedAt) ?? 0) + tonnage)
  }
  return byDate
}

// Distinct training days within the current ISO week — reuses the same
// week-bucketing as computeWeeklyTonnage so this stays consistent with what
// the same data would show on the full Analytics chart.
export function countTrainingDaysThisWeek(
  records: SetHistoryRecord[],
  now: Date = new Date(),
): number {
  const currentWeekStart = getIsoWeekStart(now.toISOString().slice(0, 10))
  const uniqueDates = new Set(
    records
      .filter((record) => getIsoWeekStart(record.loggedAt) === currentWeekStart)
      .map((record) => record.loggedAt),
  )
  return uniqueDates.size
}

export interface TrendSummaryExercise {
  exerciseName: string
  recentPoints: DailyExerciseBest[]
}

export interface TrendSummary {
  weeklyTonnage: WeeklyTonnage[]
  trainingDaysThisWeek: number
  totalSetsInWindow: number
  exercises: TrendSummaryExercise[]
}

const TREND_WEEKS_WINDOW = 8
const TREND_MAX_EXERCISES = 5
const TREND_POINTS_PER_EXERCISE = 6

// Condenses raw set history into the compact shape sent to the AI trend
// analysis — a handful of numbers per exercise/week, not a full data dump.
// Reuses the same pure functions the Analytics page itself charts from, so
// what the AI reasons about matches what the user can already see.
export function buildTrendSummary(
  records: SetHistoryRecord[],
  now: Date = new Date(),
): TrendSummary {
  // A real calendar cutoff, not "the last 8 populated weeks" —
  // computeWeeklyTonnage is sparse (only weeks with logged sets appear at
  // all), so slicing its output would silently reach arbitrarily far back
  // in time across a training gap instead of stopping 8 weeks ago.
  const currentWeekStart = getIsoWeekStart(now.toISOString().slice(0, 10))
  const windowStartDate = new Date(`${currentWeekStart}T00:00:00Z`)
  windowStartDate.setUTCDate(windowStartDate.getUTCDate() - (TREND_WEEKS_WINDOW - 1) * 7)
  const windowStart = windowStartDate.toISOString().slice(0, 10)

  const recentRecords = records.filter((record) => record.loggedAt >= windowStart)
  const weeklyTonnage = computeWeeklyTonnage(recentRecords)

  const frequencyByExercise = new Map<string, number>()
  for (const record of recentRecords) {
    frequencyByExercise.set(
      record.exerciseId,
      (frequencyByExercise.get(record.exerciseId) ?? 0) + 1,
    )
  }

  const topExerciseIds = [...frequencyByExercise.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TREND_MAX_EXERCISES)
    .map(([exerciseId]) => exerciseId)

  // getLoggedExercises sorts alphabetically — build the name lookup from it,
  // but keep the frequency order from topExerciseIds for the final list
  // (most-trained first reads more naturally than alphabetical here).
  const nameByExerciseId = new Map(
    getLoggedExercises(recentRecords).map((exercise) => [
      exercise.exerciseId,
      exercise.exerciseName,
    ]),
  )

  const exercises = topExerciseIds
    .map((exerciseId) => ({
      exerciseName: nameByExerciseId.get(exerciseId) ?? 'Exercice',
      recentPoints: computeOneRepMaxProgression(records, exerciseId).slice(
        -TREND_POINTS_PER_EXERCISE,
      ),
    }))

  return {
    weeklyTonnage,
    trainingDaysThisWeek: countTrainingDaysThisWeek(records, now),
    totalSetsInWindow: recentRecords.length,
    exercises,
  }
}

export interface RecentHighlight {
  date: string
  exerciseName: string
  imageUrl: string | null
  muscleGroup: string | null
  weightKg: number
  reps: number
  estimatedOneRepMaxKg: number | null
}

// A recap of the heaviest set from the most recently logged day — "here's
// what you just did", not a full progression view (that's what /analytics
// is for).
export function getMostRecentHighlight(
  records: SetHistoryRecord[],
): RecentHighlight | null {
  if (records.length === 0) return null
  const latestDate = records.reduce(
    (max, record) => (record.loggedAt > max ? record.loggedAt : max),
    records[0]!.loggedAt,
  )
  const sameDay = records.filter((record) => record.loggedAt === latestDate)
  const heaviest = sameDay.reduce(
    (best, record) => (record.weightKg > best.weightKg ? record : best),
    sameDay[0]!,
  )
  return {
    date: latestDate,
    exerciseName: heaviest.exerciseName,
    imageUrl: heaviest.imageUrl,
    muscleGroup: heaviest.muscleGroup,
    weightKg: heaviest.weightKg,
    reps: heaviest.reps,
    estimatedOneRepMaxKg:
      estimateOneRepMax(heaviest.weightKg, heaviest.reps)?.averageKg ?? null,
  }
}
