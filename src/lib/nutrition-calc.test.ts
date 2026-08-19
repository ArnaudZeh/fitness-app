import { describe, expect, it } from 'vitest'
import {
  buildNutritionContext,
  caloriesFromMacros,
  computeAge,
  computeAverageWeeklyTrainingMinutes,
  computeBMR,
  computeFoodLogTotals,
  computeNutritionTargets,
  dailyActivityMultiplierFromSteps,
  trainingVolumeBump,
} from '@/lib/nutrition-calc'

describe('caloriesFromMacros', () => {
  it('sums protein/carbs at 4 kcal/g and fat at 9 kcal/g', () => {
    expect(caloriesFromMacros(150, 200, 60)).toBe(150 * 4 + 200 * 4 + 60 * 9)
  })

  it('returns 0 for all-zero macros', () => {
    expect(caloriesFromMacros(0, 0, 0)).toBe(0)
  })
})

describe('computeAge', () => {
  it('counts a full year once the birthday has passed this year', () => {
    expect(computeAge('1990-03-01', new Date('2026-08-14T00:00:00Z'))).toBe(36)
  })

  it('does not count this year yet if the birthday has not happened', () => {
    expect(computeAge('1990-12-25', new Date('2026-08-14T00:00:00Z'))).toBe(35)
  })

  it('counts the birthday itself as already turned', () => {
    expect(computeAge('1990-08-14', new Date('2026-08-14T00:00:00Z'))).toBe(36)
  })
})

describe('computeBMR', () => {
  it('applies the male Mifflin-St Jeor offset', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(computeBMR('homme', 80, 180, 30)).toBe(1780)
  })

  it('applies the female Mifflin-St Jeor offset', () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    expect(computeBMR('femme', 60, 165, 25)).toBeCloseTo(1345.25)
  })

  it('averages the two offsets for "autre"', () => {
    const base = 10 * 70 + 6.25 * 170 - 5 * 28
    expect(computeBMR('autre', 70, 170, 28)).toBeCloseTo(base - 78)
  })
})

describe('computeAverageWeeklyTrainingMinutes', () => {
  it('returns 0 for no sessions', () => {
    expect(computeAverageWeeklyTrainingMinutes([], 14)).toBe(0)
  })

  it('sums durations and scales to a weekly average', () => {
    const sessions = [
      { startedAt: '2026-08-01T10:00:00Z', completedAt: '2026-08-01T11:00:00Z' }, // 60min
      { startedAt: '2026-08-03T10:00:00Z', completedAt: '2026-08-03T10:30:00Z' }, // 30min
    ]
    // 90min total over a 14-day window -> 90/14*7 = 45min/week
    expect(computeAverageWeeklyTrainingMinutes(sessions, 14)).toBeCloseTo(45)
  })

  it('skips sessions with no completed_at', () => {
    const sessions = [
      { startedAt: '2026-08-01T10:00:00Z', completedAt: '2026-08-01T11:00:00Z' }, // 60min
      { startedAt: '2026-08-02T10:00:00Z', completedAt: null },
    ]
    expect(computeAverageWeeklyTrainingMinutes(sessions, 14)).toBeCloseTo((60 / 14) * 7)
  })

  it('caps an abnormally long session (forgot to end it) at 180 minutes', () => {
    const sessions = [
      { startedAt: '2026-08-01T10:00:00Z', completedAt: '2026-08-03T10:00:00Z' }, // 48h
    ]
    expect(computeAverageWeeklyTrainingMinutes(sessions, 14)).toBeCloseTo((180 / 14) * 7)
  })
})

describe('trainingVolumeBump', () => {
  it('returns 0 for no training', () => {
    expect(trainingVolumeBump(0)).toBe(0)
  })

  it('is inclusive at each bracket boundary', () => {
    expect(trainingVolumeBump(90)).toBeCloseTo(0.1)
    expect(trainingVolumeBump(180)).toBeCloseTo(0.2)
    expect(trainingVolumeBump(300)).toBeCloseTo(0.3)
  })

  it('rounds up to the next bracket just past a boundary', () => {
    expect(trainingVolumeBump(91)).toBeCloseTo(0.2)
  })

  it('caps at the top bracket for very high volumes', () => {
    expect(trainingVolumeBump(301)).toBeCloseTo(0.4)
    expect(trainingVolumeBump(10000)).toBeCloseTo(0.4)
  })
})

describe('dailyActivityMultiplierFromSteps', () => {
  it('follows the Tudor-Locke step brackets', () => {
    expect(dailyActivityMultiplierFromSteps(3000)).toBeCloseTo(1.15)
    expect(dailyActivityMultiplierFromSteps(5000)).toBeCloseTo(1.15)
    expect(dailyActivityMultiplierFromSteps(7000)).toBeCloseTo(1.2)
    expect(dailyActivityMultiplierFromSteps(9000)).toBeCloseTo(1.3)
    expect(dailyActivityMultiplierFromSteps(11000)).toBeCloseTo(1.4)
    expect(dailyActivityMultiplierFromSteps(15000)).toBeCloseTo(1.5)
  })
})

describe('computeNutritionTargets', () => {
  it('applies a calorie deficit and higher protein for perte_de_poids', () => {
    const result = computeNutritionTargets({
      sex: 'homme',
      weightKg: 80,
      heightCm: 180,
      age: 30,
      dailyActivityMultiplier: 1.3,
      avgWeeklyTrainingMinutes: 91, // bump 0.2 -> combined 1.5
      goal: 'perte_de_poids',
    })
    // BMR 1780 * 1.5 = 2670, *0.8 deficit = 2136
    expect(result.caloriesTarget).toBe(2136)
    // 2.2 g/kg * 80kg = 176g
    expect(result.proteinGTarget).toBe(176)
  })

  it('applies a calorie surplus for prise_de_muscle', () => {
    const result = computeNutritionTargets({
      sex: 'homme',
      weightKg: 80,
      heightCm: 180,
      age: 30,
      dailyActivityMultiplier: 1.3,
      avgWeeklyTrainingMinutes: 91,
      goal: 'prise_de_muscle',
    })
    // BMR 1780 * 1.5 = 2670, *1.1 surplus = 2937
    expect(result.caloriesTarget).toBe(2937)
  })

  it('does not change protein when only activity/training volume changes', () => {
    const low = computeNutritionTargets({
      sex: 'homme',
      weightKg: 80,
      heightCm: 180,
      age: 30,
      dailyActivityMultiplier: 1.15,
      avgWeeklyTrainingMinutes: 0,
      goal: 'prise_de_muscle',
    })
    const high = computeNutritionTargets({
      sex: 'homme',
      weightKg: 80,
      heightCm: 180,
      age: 30,
      dailyActivityMultiplier: 1.5,
      avgWeeklyTrainingMinutes: 400,
      goal: 'prise_de_muscle',
    })
    expect(low.proteinGTarget).toBe(high.proteinGTarget)
    expect(low.caloriesTarget).toBeLessThan(high.caloriesTarget)
  })

  it('stays at maintenance for maintien', () => {
    const result = computeNutritionTargets({
      sex: 'femme',
      weightKg: 60,
      heightCm: 165,
      age: 25,
      dailyActivityMultiplier: 1.15,
      avgWeeklyTrainingMinutes: 0,
      goal: 'maintien',
    })
    // BMR 1345.25 * 1.15 = 1547.0375
    expect(result.caloriesTarget).toBe(1547)
  })

  it('clamps carbs to 0 rather than going negative when protein+fat already exceed calories', () => {
    // Low BMR (short, old, sedentary, deficit) combined with a high
    // protein-per-kg ratio at a high bodyweight is enough to push
    // protein+fat calories past the (already-reduced) calorie target.
    const result = computeNutritionTargets({
      sex: 'femme',
      weightKg: 100,
      heightCm: 100,
      age: 100,
      dailyActivityMultiplier: 1.15,
      avgWeeklyTrainingMinutes: 0,
      goal: 'perte_de_poids',
    })
    expect(result.carbsGTarget).toBe(0)
  })

  it('splits macros so protein/carbs/fat calories reconstruct the total within rounding error', () => {
    const result = computeNutritionTargets({
      sex: 'homme',
      weightKg: 80,
      heightCm: 180,
      age: 30,
      dailyActivityMultiplier: 1.5,
      avgWeeklyTrainingMinutes: 400,
      goal: 'maintien',
    })
    const reconstructed =
      result.proteinGTarget * 4 + result.carbsGTarget * 4 + result.fatGTarget * 9
    // Each of the 4 figures is rounded independently, so allow a small
    // cumulative rounding error rather than requiring an exact match.
    expect(Math.abs(reconstructed - result.caloriesTarget)).toBeLessThanOrEqual(10)
  })
})

describe('computeFoodLogTotals', () => {
  it('scales all four values by quantity/100', () => {
    const result = computeFoodLogTotals({
      quantityG: 150,
      caloriesPer100g: 200,
      proteinGPer100g: 20,
      carbsGPer100g: 10,
      fatGPer100g: 5,
    })
    expect(result).toEqual({ calories: 300, proteinG: 30, carbsG: 15, fatG: 7.5 })
  })

  it('keeps optional macros null when not provided', () => {
    const result = computeFoodLogTotals({
      quantityG: 100,
      caloriesPer100g: 150,
      proteinGPer100g: null,
      carbsGPer100g: null,
      fatGPer100g: null,
    })
    expect(result).toEqual({ calories: 150, proteinG: null, carbsG: null, fatG: null })
  })
})

describe('buildNutritionContext', () => {
  const targets = {
    activity_level: 'modere' as const,
    calories_target: 2400,
    protein_g_target: 180,
    carbs_g_target: 220,
    fat_g_target: 75,
  }

  it('returns null targets when calories_target was never computed', () => {
    const result = buildNutritionContext(
      { activity_level: null, calories_target: null, protein_g_target: null, carbs_g_target: null, fat_g_target: null },
      [],
      '2026-08-18',
    )
    expect(result.targets).toBeNull()
  })

  it('maps snake_case targets to a camelCase snapshot', () => {
    const result = buildNutritionContext(targets, [], '2026-08-18')
    expect(result.targets).toEqual({
      activityLevel: 'modere',
      caloriesTarget: 2400,
      proteinGTarget: 180,
      carbsGTarget: 220,
      fatGTarget: 75,
    })
  })

  it('returns null today when nothing was logged today', () => {
    const result = buildNutritionContext(targets, [], '2026-08-18')
    expect(result.today).toBeNull()
    expect(result.last7Days).toBeNull()
  })

  it("sums today's entries across multiple logs the same day", () => {
    const result = buildNutritionContext(
      targets,
      [
        { logged_date: '2026-08-18', calories: 300, protein_g: 30, carbs_g: 20, fat_g: 10 },
        { logged_date: '2026-08-18', calories: 200, protein_g: 10, carbs_g: 15, fat_g: 5 },
        { logged_date: '2026-08-17', calories: 1800, protein_g: 150, carbs_g: 180, fat_g: 60 },
      ],
      '2026-08-18',
    )
    expect(result.today).toEqual({
      caloriesConsumed: 500,
      proteinGConsumed: 40,
      carbsGConsumed: 35,
      fatGConsumed: 15,
    })
  })

  it('averages last7Days over days actually logged, not a fixed 7', () => {
    const result = buildNutritionContext(
      targets,
      [
        { logged_date: '2026-08-18', calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 60 },
        { logged_date: '2026-08-17', calories: 2200, protein_g: 170, carbs_g: 210, fat_g: 70 },
      ],
      '2026-08-18',
    )
    // Only 2 distinct days logged out of a 7-day window — average divides
    // by 2 (days actually logged), not 7, so a sparse week doesn't look
    // like severe under-eating.
    expect(result.last7Days).toEqual({
      daysLogged: 2,
      avgCaloriesConsumed: 2100,
      avgProteinGConsumed: 160,
      avgCarbsGConsumed: 205,
      avgFatGConsumed: 65,
    })
  })

  it('treats missing optional macros on a log entry as 0', () => {
    const result = buildNutritionContext(
      targets,
      [{ logged_date: '2026-08-18', calories: 150, protein_g: null, carbs_g: null, fat_g: null }],
      '2026-08-18',
    )
    expect(result.today).toEqual({
      caloriesConsumed: 150,
      proteinGConsumed: 0,
      carbsGConsumed: 0,
      fatGConsumed: 0,
    })
  })
})
