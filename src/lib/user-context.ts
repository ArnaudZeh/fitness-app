import type { Goal, Profile, Sex } from '@/lib/profile-api'
import type { WeightEntry } from '@/lib/weight-api'

export interface UserProfileContext {
  sex: Sex | null
  ageYears: number | null
  heightCm: number | null
  goal: Goal | null
  targetWeightKg: number | null
  currentWeightKg: number | null
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

// Shared across every couche IA feature that needs to know *who* it's
// coaching, not just their training history — trend analysis today,
// program generation/session adaptation next. weightEntries is expected
// sorted most-recent-first (fetchWeightEntries already orders this way).
export function buildUserProfileContext(
  profile: Profile,
  weightEntries: Pick<WeightEntry, 'weight_kg'>[],
  now: Date = new Date(),
): UserProfileContext {
  return {
    sex: profile.sex,
    ageYears: profile.date_of_birth ? computeAge(profile.date_of_birth, now) : null,
    heightCm: profile.height_cm,
    goal: profile.goal,
    targetWeightKg: profile.target_weight_kg,
    currentWeightKg: weightEntries[0]?.weight_kg ?? null,
  }
}
