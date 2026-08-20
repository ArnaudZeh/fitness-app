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
// training into the occupational scale.
//
// Driven by actual weekly training TIME (sum of started_at→completed_at
// across recently completed sessions), not just a session count — a count
// alone treats a 20-minute session the same as a 90-minute one. Time is
// still only a volume proxy, not a real energy-expenditure measure (that
// would need heart-rate data this app doesn't collect) — going further and
// weighting by tonnage or average RPE was considered and rejected: neither
// has a validated conversion to calories (RPE measures perceived exertion,
// not energy cost; tonnage's kcal-per-kg-moved varies per person), so
// using them would produce a number that looks precise without actually
// being more accurate. ~45min is treated as a "typical" session when
// picking bracket boundaries, keeping the same 0/0.1/0.2/0.3/0.4 bump
// values (and therefore the same combined 1.15-1.9 range) as the original
// session-count version.
export const TRAINING_MINUTES_BUMP: { maxMinutesPerWeek: number; bump: number }[] = [
  { maxMinutesPerWeek: 0, bump: 0 },
  { maxMinutesPerWeek: 90, bump: 0.1 },
  { maxMinutesPerWeek: 180, bump: 0.2 },
  { maxMinutesPerWeek: 300, bump: 0.3 },
  { maxMinutesPerWeek: Infinity, bump: 0.4 },
]

export function trainingVolumeBump(avgWeeklyTrainingMinutes: number): number {
  const bracket = TRAINING_MINUTES_BUMP.find(
    (entry) => avgWeeklyTrainingMinutes <= entry.maxMinutesPerWeek,
  )
  return bracket?.bump ?? 0.4
}

// A session left running for hours (forgot to tap "Terminer") shouldn't
// blow up the weekly average — caps any single session's contribution at
// a generous but bounded ceiling.
const MAX_SESSION_MINUTES = 180

export interface CompletedSessionWindow {
  startedAt: string
  completedAt: string | null
}

export function computeAverageWeeklyTrainingMinutes(
  sessions: CompletedSessionWindow[],
  windowDays: number,
): number {
  const totalMinutes = sessions.reduce((sum, session) => {
    if (!session.completedAt) return sum
    const minutes =
      (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 60000
    return sum + Math.max(0, Math.min(minutes, MAX_SESSION_MINUTES))
  }, 0)
  return (totalMinutes / windowDays) * 7
}

// Step-count-based daily/occupational activity, used in place of the
// self-declared 3-way select when available (avg_daily_steps on the
// coaching profile) — a continuous, objective signal beats a coarse
// self-reported category. Brackets follow Tudor-Locke & Bassett (2004,
// "How many steps/day are enough?"), a widely-cited step-count activity
// categorization, mapped onto the same 1.15-1.5 range as
// DAILY_ACTIVITY_MULTIPLIERS so the two stay consistent at both ends
// (sedentary ≈1.15, most active ≈1.5).
const STEP_ACTIVITY_BRACKETS: { maxSteps: number; multiplier: number }[] = [
  { maxSteps: 5000, multiplier: 1.15 }, // sédentaire
  { maxSteps: 7499, multiplier: 1.2 }, // peu actif
  { maxSteps: 9999, multiplier: 1.3 }, // assez actif
  { maxSteps: 12499, multiplier: 1.4 }, // actif
  { maxSteps: Infinity, multiplier: 1.5 }, // très actif
]

export function dailyActivityMultiplierFromSteps(avgDailySteps: number): number {
  const bracket = STEP_ACTIVITY_BRACKETS.find((entry) => avgDailySteps <= entry.maxSteps)
  return bracket?.multiplier ?? 1.5
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
  // Resolved daily/occupational multiplier — either
  // DAILY_ACTIVITY_MULTIPLIERS[level] (self-declared) or
  // dailyActivityMultiplierFromSteps(avgDailySteps) (from the coaching
  // profile, prioritized when available). Left to the caller to resolve
  // so this function doesn't need to know which source won.
  dailyActivityMultiplier: number
  avgWeeklyTrainingMinutes: number
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
    input.dailyActivityMultiplier + trainingVolumeBump(input.avgWeeklyTrainingMinutes)
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

// Calories aren't an independent value — they're defined by the three
// macros (4/4/9 kcal per gram). Used to keep the calorie target in sync
// whenever protein/carbs/fat are edited by hand, instead of letting the
// two drift apart.
export function caloriesFromMacros(proteinG: number, carbsG: number, fatG: number): number {
  return Math.round(
    proteinG * KCAL_PER_G_PROTEIN + carbsG * KCAL_PER_G_CARBS + fatG * KCAL_PER_G_FAT,
  )
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

export interface ConsumedTotals {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

// Sums a day's food_logs into the 4 totals every "cibles vs consommé" view
// needs (NutritionPage, and the dashboard ring/card added later) — a food
// log's own protein_g/carbs_g/fat_g are optional (a manually-typed entry
// might skip macros), treated as 0 in the sum rather than making the whole
// total null.
export function computeConsumedTotals(
  logs: { calories: number; protein_g: number | null; carbs_g: number | null; fat_g: number | null }[],
): ConsumedTotals {
  return logs.reduce(
    (totals, log) => ({
      calories: totals.calories + log.calories,
      proteinG: totals.proteinG + (log.protein_g ?? 0),
      carbsG: totals.carbsG + (log.carbs_g ?? 0),
      fatG: totals.fatG + (log.fat_g ?? 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  )
}

// Structural subsets of NutritionTargets/FoodLog (nutrition-targets-api.ts /
// food-logs-api.ts) — accepting the raw fetched rows directly (extra fields
// like id/created_at just get ignored) avoids a remapping layer at every
// call site, same convention as buildUserProfileContext's
// Pick<WeightEntry, 'weight_kg'>[] parameter in user-context.ts.
export interface NutritionTargetsSnapshot {
  activity_level: DailyActivityLevel | null
  calories_target: number | null
  protein_g_target: number | null
  carbs_g_target: number | null
  fat_g_target: number | null
}

export interface FoodLogEntrySnapshot {
  logged_date: string
  calories: number
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

export interface NutritionContext {
  targets: {
    activityLevel: DailyActivityLevel | null
    caloriesTarget: number
    proteinGTarget: number
    carbsGTarget: number
    fatGTarget: number
  } | null
  today: {
    caloriesConsumed: number
    proteinGConsumed: number
    carbsGConsumed: number
    fatGConsumed: number
  } | null
  last7Days: {
    daysLogged: number
    avgCaloriesConsumed: number
    avgProteinGConsumed: number
    avgCarbsGConsumed: number
    avgFatGConsumed: number
  } | null
}

function sumEntries(entries: FoodLogEntrySnapshot[]) {
  return entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      proteinG: acc.proteinG + (entry.protein_g ?? 0),
      carbsG: acc.carbsG + (entry.carbs_g ?? 0),
      fatG: acc.fatG + (entry.fat_g ?? 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  )
}

// recentLogs is expected to cover the last 7 calendar days (including
// today) — the caller fetches by a real date cutoff (fetchFoodLogsSince),
// not just "however many rows happen to be recent", same lesson as the
// sparse-array trend-window bug documented in project history. Averages
// are computed over days actually logged, not a fixed /7 — a day with zero
// entries means "not logged", not "ate zero calories", so diluting the
// average with it would understate real intake.
export function buildNutritionContext(
  targets: NutritionTargetsSnapshot | null,
  recentLogs: FoodLogEntrySnapshot[],
  todayIsoDate: string,
): NutritionContext {
  const targetsResult =
    targets && targets.calories_target !== null
      ? {
          activityLevel: targets.activity_level,
          caloriesTarget: targets.calories_target,
          proteinGTarget: targets.protein_g_target ?? 0,
          carbsGTarget: targets.carbs_g_target ?? 0,
          fatGTarget: targets.fat_g_target ?? 0,
        }
      : null

  const byDate = new Map<string, FoodLogEntrySnapshot[]>()
  for (const entry of recentLogs) {
    const list = byDate.get(entry.logged_date)
    if (list) list.push(entry)
    else byDate.set(entry.logged_date, [entry])
  }

  const todayEntries = byDate.get(todayIsoDate)
  const today = todayEntries
    ? {
        caloriesConsumed: sumEntries(todayEntries).calories,
        proteinGConsumed: sumEntries(todayEntries).proteinG,
        carbsGConsumed: sumEntries(todayEntries).carbsG,
        fatGConsumed: sumEntries(todayEntries).fatG,
      }
    : null

  const loggedDates = [...byDate.keys()]
  let last7Days: NutritionContext['last7Days'] = null
  if (loggedDates.length > 0) {
    const totals = loggedDates.reduce(
      (acc, date) => {
        const dayTotal = sumEntries(byDate.get(date) ?? [])
        return {
          calories: acc.calories + dayTotal.calories,
          proteinG: acc.proteinG + dayTotal.proteinG,
          carbsG: acc.carbsG + dayTotal.carbsG,
          fatG: acc.fatG + dayTotal.fatG,
        }
      },
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    )
    const daysLogged = loggedDates.length
    last7Days = {
      daysLogged,
      avgCaloriesConsumed: Math.round(totals.calories / daysLogged),
      avgProteinGConsumed: Math.round(totals.proteinG / daysLogged),
      avgCarbsGConsumed: Math.round(totals.carbsG / daysLogged),
      avgFatGConsumed: Math.round(totals.fatG / daysLogged),
    }
  }

  return { targets: targetsResult, today, last7Days }
}
