import { describe, expect, it } from 'vitest'
import { computeAge, computeBMR, computeNutritionTargets } from '@/lib/nutrition-calc'

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

describe('computeNutritionTargets', () => {
  it('applies a calorie deficit and higher protein for perte_de_poids', () => {
    const result = computeNutritionTargets({
      sex: 'homme',
      weightKg: 80,
      heightCm: 180,
      age: 30,
      activityLevel: 'modere',
      goal: 'perte_de_poids',
    })
    // BMR 1780 * 1.55 = 2759, *0.8 deficit = 2207.2
    expect(result.caloriesTarget).toBe(2207)
    // 2.2 g/kg * 80kg = 176g
    expect(result.proteinGTarget).toBe(176)
  })

  it('applies a calorie surplus for prise_de_muscle', () => {
    const result = computeNutritionTargets({
      sex: 'homme',
      weightKg: 80,
      heightCm: 180,
      age: 30,
      activityLevel: 'modere',
      goal: 'prise_de_muscle',
    })
    // BMR 1780 * 1.55 = 2759, *1.1 surplus = 3034.9
    expect(result.caloriesTarget).toBe(3035)
  })

  it('stays at maintenance for maintien', () => {
    const result = computeNutritionTargets({
      sex: 'femme',
      weightKg: 60,
      heightCm: 165,
      age: 25,
      activityLevel: 'sedentaire',
      goal: 'maintien',
    })
    // BMR 1345.25 * 1.2 = 1614.3
    expect(result.caloriesTarget).toBe(1614)
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
      activityLevel: 'sedentaire',
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
      activityLevel: 'actif',
      goal: 'maintien',
    })
    const reconstructed =
      result.proteinGTarget * 4 + result.carbsGTarget * 4 + result.fatGTarget * 9
    // Each of the 4 figures is rounded independently, so allow a small
    // cumulative rounding error rather than requiring an exact match.
    expect(Math.abs(reconstructed - result.caloriesTarget)).toBeLessThanOrEqual(10)
  })
})
