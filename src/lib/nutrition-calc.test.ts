import { describe, expect, it } from 'vitest'
import {
  computeAge,
  computeBMR,
  computeFoodLogTotals,
  computeNutritionTargets,
  trainingFrequencyBump,
} from '@/lib/nutrition-calc'

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

describe('trainingFrequencyBump', () => {
  it('returns 0 for no training', () => {
    expect(trainingFrequencyBump(0)).toBe(0)
  })

  it('is inclusive at each bracket boundary', () => {
    expect(trainingFrequencyBump(2)).toBeCloseTo(0.1)
    expect(trainingFrequencyBump(4)).toBeCloseTo(0.2)
    expect(trainingFrequencyBump(6)).toBeCloseTo(0.3)
  })

  it('rounds up to the next bracket just past a boundary', () => {
    expect(trainingFrequencyBump(2.5)).toBeCloseTo(0.2)
    expect(trainingFrequencyBump(5)).toBeCloseTo(0.3)
  })

  it('caps at the top bracket for very high frequencies', () => {
    expect(trainingFrequencyBump(7)).toBeCloseTo(0.4)
    expect(trainingFrequencyBump(100)).toBeCloseTo(0.4)
  })
})

describe('computeNutritionTargets', () => {
  it('applies a calorie deficit and higher protein for perte_de_poids', () => {
    const result = computeNutritionTargets({
      sex: 'homme',
      weightKg: 80,
      heightCm: 180,
      age: 30,
      dailyActivityLevel: 'modere',
      avgSessionsPerWeek: 3,
      goal: 'perte_de_poids',
    })
    // BMR 1780 * (1.3 + 0.2 training bump) = 2670, *0.8 deficit = 2136
    expect(result.caloriesTarget).toBe(2136)
    // 2.2 g/kg * 80kg = 176g — independent of activity level
    expect(result.proteinGTarget).toBe(176)
  })

  it('applies a calorie surplus for prise_de_muscle', () => {
    const result = computeNutritionTargets({
      sex: 'homme',
      weightKg: 80,
      heightCm: 180,
      age: 30,
      dailyActivityLevel: 'modere',
      avgSessionsPerWeek: 3,
      goal: 'prise_de_muscle',
    })
    // BMR 1780 * 1.5 = 2670, *1.1 surplus = 2937
    expect(result.caloriesTarget).toBe(2937)
  })

  it('does not change protein when only activity level/training volume changes', () => {
    const sedentary = computeNutritionTargets({
      sex: 'homme',
      weightKg: 80,
      heightCm: 180,
      age: 30,
      dailyActivityLevel: 'sedentaire',
      avgSessionsPerWeek: 0,
      goal: 'prise_de_muscle',
    })
    const active = computeNutritionTargets({
      sex: 'homme',
      weightKg: 80,
      heightCm: 180,
      age: 30,
      dailyActivityLevel: 'physique',
      avgSessionsPerWeek: 6,
      goal: 'prise_de_muscle',
    })
    expect(sedentary.proteinGTarget).toBe(active.proteinGTarget)
    expect(sedentary.caloriesTarget).toBeLessThan(active.caloriesTarget)
  })

  it('stays at maintenance for maintien', () => {
    const result = computeNutritionTargets({
      sex: 'femme',
      weightKg: 60,
      heightCm: 165,
      age: 25,
      dailyActivityLevel: 'sedentaire',
      avgSessionsPerWeek: 0,
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
      dailyActivityLevel: 'sedentaire',
      avgSessionsPerWeek: 0,
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
      dailyActivityLevel: 'physique',
      avgSessionsPerWeek: 7,
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
