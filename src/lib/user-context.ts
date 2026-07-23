import type { Goal, Profile, Sex } from '@/lib/profile-api'
import type { WeightEntry } from '@/lib/weight-api'
import type { CycleEntry } from '@/lib/cycle-api'
import { computeCyclePhase, type CyclePhase } from '@/lib/cycle-phase'

export interface UserProfileContext {
  sex: Sex | null
  ageYears: number | null
  heightCm: number | null
  goal: Goal | null
  targetWeightKg: number | null
  currentWeightKg: number | null
  cyclePhase: { phase: CyclePhase; cycleDay: number } | null
}

// Whole years, not just a year subtraction — someone born on 2000-12-30
// isn't a year older the moment the calendar flips to a new year in
// January, only after their actual birthday has passed.
export function computeAge(dateOfBirth: string, now: Date = new Date()): number {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`)
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const hasHadBirthdayThisYear =
    now.getUTCMonth() > birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() >= birth.getUTCDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

function toLocalDateString(now: Date): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Shared across every couche IA feature that needs to know *who* it's
// coaching, not just their training history — trend analysis, program
// generation, session adaptation. weightEntries is expected sorted
// most-recent-first (fetchWeightEntries already orders this way);
// cycleEntries is expected sorted oldest-first (fetchCycleEntries already
// orders this way — same convention computeCyclePhase itself expects).
export function buildUserProfileContext(
  profile: Profile,
  weightEntries: Pick<WeightEntry, 'weight_kg'>[],
  cycleEntries: Pick<CycleEntry, 'start_date'>[],
  now: Date = new Date(),
): UserProfileContext {
  // Opt-in, same as everywhere else the cycle module appears: never compute
  // or send a phase unless the user has explicitly turned the module on,
  // even if past entries still exist from before they disabled it.
  const cyclePhaseResult = profile.cycle_module_enabled
    ? computeCyclePhase(
        cycleEntries.map((entry) => entry.start_date),
        toLocalDateString(now),
      )
    : null

  return {
    sex: profile.sex,
    ageYears: profile.date_of_birth ? computeAge(profile.date_of_birth, now) : null,
    heightCm: profile.height_cm,
    goal: profile.goal,
    targetWeightKg: profile.target_weight_kg,
    currentWeightKg: weightEntries[0]?.weight_kg ?? null,
    cyclePhase: cyclePhaseResult
      ? { phase: cyclePhaseResult.phase, cycleDay: cyclePhaseResult.cycleDay }
      : null,
  }
}
