import type { Goal, Sex } from '@/lib/profile-api'

// Daily/occupational activity only ("NEAT hors sport") — deliberately
// narrower than a classic 5-way PAL category. A single blended category
// (the original design) breaks down for a desk job combined with a
// serious training schedule: picking "modéré" undercounts a heavy lifter,
// picking "actif" overcounts the other 5 days spent at a desk. Structured
// training volume is handled as a separate, derived factor below instead
// (see TRAINING_FREQUENCY_BUMP) rather than folded into this scale.
export type DailyActivityLevel = 'sedentaire' | 'modere' | 'physique'

export const DAILY_ACTIVITY_LEVEL_LABELS: Record<DailyActivityLevel, string> = {
  sedentaire: 'Sédentaire (bureau, peu de mouvement)',
  modere: 'Modérément actif (debout, marche régulière)',
  physique: 'Physique (métier manuel)',
}

// Baseline PAL-equivalent multiplier for daily/occupational activity
// alone, before any training is added — lower across the board than a
// classic single-scale PAL (which bakes in an assumed activity/exercise
// correlation this model deliberately doesn't assume).
export const DAILY_ACTIVITY_MULTIPLIERS: Record<DailyActivityLevel, number> = {
  sedentaire: 1.15,
  modere: 1.3,
  physique: 1.5,
}

// Additive bump for structured training volume, on top of the daily
// baseline above — the same decomposition (occupational NEAT + separate
// exercise activity thermogenesis) used in Katch-McArdle-style TDEE
// breakdowns and common coaching practice (e.g. RP), rather than folding
// training into the occupational scale. Calibrated so daily+training
// together still land in the same ~1.15-1.9 range as the classic 5-way
// PAL scale (physique + 7+ sessions/week = 1.5 + 0.4 = 1.9, matching the
// old "très actif" ceiling) — a decomposition of the same evidence base,
// not a new independently-validated formula.
export const TRAINING_FREQUENCY_BUMP: { maxPerWeek: number; bump: number }[] = [
  { maxPerWeek: 0, bump: 0 },
  { maxPerWeek: 2, bump: 0.1 },
  { maxPerWeek: 4, bump: 0.2 },
  { maxPerWeek: 6, bump: 0.3 },
  { maxPerWeek: Infinity, bump: 0.4 },
]

export function trainingFrequencyBump(avgSessionsPerWeek: number): number {
  const bracket = TRAINING_FREQUENCY_BUMP.find(
    (entry) => avgSessionsPerWeek <= entry.maxPerWeek,
  )
  return bracket?.bump ?? 0.4
}

// Deficit/surplus applied to TDEE by goal. perte_de_poids: ~20% deficit is
// within the sustainable 15-25% range for ~0.5-1%/week loss without undue
// muscle loss (ACSM position stand). prise_de_muscle: a modest ~10%
// surplus minimizes fat gain while still supporting hypertrophy (Aragon &
// Schoenfeld 2013, "Nutrient timing revisited"). recomposition/performance/
// maintien stay at maintenance — recomposition is driven by training +
// protein at maintenance calories (Barakat et al. 2020), not by calories.
export const GOAL_CALORIE_MULTIPLIERS: Record<Goal, number> = {
  perte_de_poids: 0.8,
  prise_de_muscle: 1.1,
  recomposition: 1,
  performance: 1,
  maintien: 1,
}

// Protein target in g/kg bodyweight. Higher during a deficit to preserve
// lean mass (Helms et al. 2014 recommend up to ~2.3-3.1 g/kg fat-free mass
// during a cut; 2.2 g/kg total bodyweight is a practical approximation).
// prise_de_muscle/recomposition sit within the ISSN range where most of
// the hypertrophy benefit is already captured (Morton et al. 2018
// meta-analysis: diminishing returns past ~1.6 g/kg, some benefit to ~2.2).
// performance/maintien use a lower maintenance-sufficient value.
// Deliberately independent of activity level — protein requirement scales
// with bodyweight and training goal, not with PAL/NEAT category (standard
// ISSN practice), so changing activity level never moves this figure.
export const GOAL_PROTEIN_G_PER_KG: Record<Goal, number> = {
  perte_de_poids: 2.2,
  prise_de_muscle: 1.8,
  recomposition: 2,
  performance: 1.6,
  maintien: 1.6,
}

// Fat as a share of total calories — kept above the ~20% floor generally
// recommended for essential fatty acid intake and hormone production,
// without being prescriptive beyond that.
const FAT_CALORIE_SHARE = 0.28

const KCAL_PER_G_PROTEIN = 4
const KCAL_PER_G_CARBS = 4
const KCAL_PER_G_FAT = 9

export function computeAge(dateOfBirthIso: string, referenceDate: Date = new Date()): number {
  const birth = new Date(`${dateOfBirthIso}T00:00:00Z`)
  let age = referenceDate.getUTCFullYear() - birth.getUTCFullYear()
  const hasHadBirthdayThisYear =
    referenceDate.getUTCMonth() > birth.getUTCMonth() ||
    (referenceDate.getUTCMonth() === birth.getUTCMonth() &&
      referenceDate.getUTCDate() >= birth.getUTCDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

// Mifflin-St Jeor — the modern default over the older Harris-Benedict
// equation (shown more accurate for both normal-weight and overweight
// adults in Frankenfield et al. 2005, J Am Diet Assoc). "autre" averages
// the male/female formulas as a neutral default in the absence of a
// third term in the equation itself.
export function computeBMR(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  if (sex === 'homme') return base + 5
  if (sex === 'femme') return base - 161
  return base - 78
}

export interface NutritionCalcInput {
  sex: Sex
  weightKg: number
  heightCm: number
  age: number
  dailyActivityLevel: DailyActivityLevel
  avgSessionsPerWeek: number
  goal: Goal
}

export interface NutritionCalcResult {
  caloriesTarget: number
  proteinGTarget: number
  carbsGTarget: number
  fatGTarget: number
}

export function computeNutritionTargets(input: NutritionCalcInput): NutritionCalcResult {
  const bmr = computeBMR(input.sex, input.weightKg, input.heightCm, input.age)
  const activityMultiplier =
    DAILY_ACTIVITY_MULTIPLIERS[input.dailyActivityLevel] +
    trainingFrequencyBump(input.avgSessionsPerWeek)
  const tdee = bmr * activityMultiplier
  const calories = tdee * GOAL_CALORIE_MULTIPLIERS[input.goal]

  const proteinG = GOAL_PROTEIN_G_PER_KG[input.goal] * input.weightKg
  const fatG = (calories * FAT_CALORIE_SHARE) / KCAL_PER_G_FAT
  const remainingCalories = Math.max(
    0,
    calories - proteinG * KCAL_PER_G_PROTEIN - fatG * KCAL_PER_G_FAT,
  )
  const carbsG = remainingCalories / KCAL_PER_G_CARBS

  return {
    caloriesTarget: Math.round(calories),
    proteinGTarget: Math.round(proteinG),
    carbsGTarget: Math.round(carbsG),
    fatGTarget: Math.round(fatG),
  }
}

export interface FoodLogTotals {
  calories: number
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
}

// Nutrition labels are printed per 100g — typing a per-100g reference plus
// how much was actually eaten is far less mental math for the user than
// typing the total for their exact portion directly.
export function computeFoodLogTotals(input: {
  quantityG: number
  caloriesPer100g: number
  proteinGPer100g: number | null
  carbsGPer100g: number | null
  fatGPer100g: number | null
}): FoodLogTotals {
  const factor = input.quantityG / 100
  const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10
  return {
    calories: Math.round(input.caloriesPer100g * factor),
    proteinG:
      input.proteinGPer100g === null ? null : roundToOneDecimal(input.proteinGPer100g * factor),
    carbsG: input.carbsGPer100g === null ? null : roundToOneDecimal(input.carbsGPer100g * factor),
    fatG: input.fatGPer100g === null ? null : roundToOneDecimal(input.fatGPer100g * factor),
  }
}
