import { estimateOneRepMax } from '@/lib/one-rep-max'
import type { SetHistoryRecord } from '@/lib/analytics-api'

export interface ExerciseOption {
  exerciseId: string
  exerciseName: string
}

// Unique exercises the user actually has logged history for, alphabetical —
// no point offering an exercise with nothing to chart.
export function getLoggedExercises(records: SetHistoryRecord[]): ExerciseOption[] {
  const byId = new Map<string, string>()
  for (const record of records) {
    if (!byId.has(record.exerciseId)) byId.set(record.exerciseId, record.exerciseName)
  }
  return [...byId.entries()]
    .map(([exerciseId, exerciseName]) => ({ exerciseId, exerciseName }))
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName))
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

function getIsoWeekStart(dateStr: string): string {
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
