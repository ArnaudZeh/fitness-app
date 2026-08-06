import { estimateOneRepMax } from '@/lib/one-rep-max'
import { toLocalDateString } from '@/lib/dates'
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
// the same data would show on the full Analytics chart. loggedAt is already
// a local calendar date (see fetchSetHistory), so now is bucketed the same
// way for a correct comparison.
export function countTrainingDaysThisWeek(
  records: SetHistoryRecord[],
  now: Date = new Date(),
): number {
  const currentWeekStart = getIsoWeekStart(toLocalDateString(now.toISOString()))
  const uniqueDates = new Set(
    records
      .filter((record) => getIsoWeekStart(record.loggedAt) === currentWeekStart)
      .map((record) => record.loggedAt),
  )
  return uniqueDates.size
}

export interface CompletedSessionRecord {
  status: string
  started_at: string
}

// Distinct calendar days within the current ISO week with at least one
// completed session log, across every program — regardless of whether any
// sets were actually logged inside it. A "séance réalisée" is the session
// having been finished, not its data entry happening to be filled in;
// countTrainingDaysThisWeek above is the set-based equivalent that feeds
// the tonnage stat, where an empty session legitimately contributes
// nothing since there's no weight×reps to sum.
export function countCompletedSessionsThisWeek(
  logs: CompletedSessionRecord[],
  now: Date = new Date(),
): number {
  const currentWeekStart = getIsoWeekStart(toLocalDateString(now.toISOString()))
  const uniqueDates = new Set(
    logs
      .filter((log) => log.status === 'completed')
      .map((log) => toLocalDateString(log.started_at))
      .filter((date) => getIsoWeekStart(date) === currentWeekStart),
  )
  return uniqueDates.size
}

// Every local calendar date with at least one completed session log,
// unbounded by week — feeds the contribution heatmap's "did I train" signal
// as a layer separate from kg-based intensity, so a completed session with
// no sets entered still shows up as activity instead of reading as a rest
// day (see ContributionHeatmap's activeDates prop).
export function getCompletedSessionDates(logs: CompletedSessionRecord[]): Set<string> {
  return new Set(
    logs.filter((log) => log.status === 'completed').map((log) => toLocalDateString(log.started_at)),
  )
}

export interface WeeklyTonnageProgress {
  // null only when there's truly nothing to show yet (no tonnage this week
  // AND no baseline from last week) — distinct from 0, which would wrongly
  // read as "no volume lifted" rather than "no baseline".
  ratio: number | null
  thisWeekTonnageKg: number
  lastWeekTonnageKg: number | null
  // True when a session was completed last week even though it logged no
  // sets (so lastWeekTonnageKg is null but it isn't accurate to say
  // "nothing happened" last week) — lets the UI tell that apart from a
  // genuinely empty week.
  lastWeekHadSessions: boolean
}

// This week's total tonnage (Σ weight × reps, reusing computeWeeklyTonnage)
// against the prior ISO week's total — "are you on pace to match or beat
// last week's volume", capped at 100% for the ring fill.
export function computeWeeklyTonnageProgress(
  records: SetHistoryRecord[],
  completedSessionDates: Set<string>,
  now: Date = new Date(),
): WeeklyTonnageProgress {
  const currentWeekStart = getIsoWeekStart(toLocalDateString(now.toISOString()))
  const priorWeekStartDate = new Date(`${currentWeekStart}T00:00:00Z`)
  priorWeekStartDate.setUTCDate(priorWeekStartDate.getUTCDate() - 7)
  const priorWeekStart = priorWeekStartDate.toISOString().slice(0, 10)

  const weekly = computeWeeklyTonnage(records)
  const thisWeekTonnageKg = weekly.find((w) => w.weekStart === currentWeekStart)?.tonnageKg ?? 0
  const priorWeek = weekly.find((w) => w.weekStart === priorWeekStart)
  const lastWeekTonnageKg = priorWeek?.tonnageKg ?? null
  const lastWeekHadSessions = [...completedSessionDates].some(
    (date) => getIsoWeekStart(date) === priorWeekStart,
  )

  if (!lastWeekTonnageKg) {
    // No usable baseline — either nothing logged last week, or sessions
    // were completed but no sets were entered (still 0 tonnage either way).
    // Any tonnage logged this week already clears that non-existent bar, so
    // the ring fills rather than sitting empty despite a real number to
    // show; only genuinely nothing-yet (0 this week too) stays null.
    return {
      ratio: thisWeekTonnageKg > 0 ? 1 : null,
      thisWeekTonnageKg,
      lastWeekTonnageKg,
      lastWeekHadSessions,
    }
  }

  return {
    ratio: Math.max(0, Math.min(1, thisWeekTonnageKg / lastWeekTonnageKg)),
    thisWeekTonnageKg,
    lastWeekTonnageKg,
    lastWeekHadSessions,
  }
}

export interface WeightEntryRecord {
  weight_kg: number
  recorded_at: string
}

export interface WeightGoalProgress {
  // null when there's no entry yet or no target set — distinct from 0
  // (which would read as "just starting" rather than "no goal configured")
  ratio: number | null
  startWeightKg: number | null
  currentWeightKg: number | null
}

// entries must be sorted newest-first (fetchWeightEntries's own order) —
// entries[0] is "current", the oldest entry is the "start" reference point
// since there's no dedicated starting-weight field on the profile.
export function computeWeightGoalProgress(
  entries: WeightEntryRecord[],
  targetWeightKg: number | null,
): WeightGoalProgress {
  const first = entries[0]
  const last = entries[entries.length - 1]
  if (!first || !last || targetWeightKg === null) {
    return { ratio: null, startWeightKg: null, currentWeightKg: null }
  }
  const currentWeightKg = first.weight_kg
  const startWeightKg = last.weight_kg

  if (startWeightKg === targetWeightKg) {
    return {
      ratio: currentWeightKg === targetWeightKg ? 1 : 0,
      startWeightKg,
      currentWeightKg,
    }
  }

  const ratio = (startWeightKg - currentWeightKg) / (startWeightKg - targetWeightKg)
  return {
    ratio: Math.max(0, Math.min(1, ratio)),
    startWeightKg,
    currentWeightKg,
  }
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

