import type { Goal, Sex } from '@/lib/profile-api'

export type ActivityLevel = 'sedentaire' | 'leger' | 'modere' | 'actif' | 'tres_actif'

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentaire: 'Sédentaire (peu ou pas d\'exercice)',
  leger: 'Légèrement actif (exercice 1-3x/semaine)',
  modere: 'Modérément actif (exercice 3-5x/semaine)',
  actif: 'Actif (exercice 6-7x/semaine)',
  tres_actif: 'Très actif (exercice quotidien intense ou travail physique)',
}

// Classic PAL (Physical Activity Level) multipliers applied to BMR to get
// TDEE — same category boundaries as the Harris-Benedict/Mifflin-St Jeor
// activity factors used by most TDEE calculators (McArdle, Katch & Katch,
// "Exercise Physiology").
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentaire: 1.2,
  leger: 1.375,
  modere: 1.55,
  actif: 1.725,
  tres_actif: 1.9,
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
  activityLevel: ActivityLevel
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
  const tdee = bmr * ACTIVITY_MULTIPLIERS[input.activityLevel]
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
