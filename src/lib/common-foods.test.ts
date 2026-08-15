import { describe, expect, it } from 'vitest'
import { searchCommonFoods } from '@/lib/common-foods'

describe('searchCommonFoods', () => {
  it('finds a match by substring', () => {
    const results = searchCommonFoods('poulet')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((food) => food.name.toLowerCase().includes('poulet'))).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(searchCommonFoods('POULET').length).toBe(searchCommonFoods('poulet').length)
  })

  it('is accent-insensitive', () => {
    // "Beurre de cacahuète" only matches if the accent is stripped from
    // both the query and the stored name before comparing.
    expect(searchCommonFoods('cacahuete').length).toBeGreaterThan(0)
  })

  it('returns an empty array for no match', () => {
    expect(searchCommonFoods('licorne')).toEqual([])
  })

  it('prefixes ids so they cannot collide with OpenFoodFacts/USDA ids', () => {
    const results = searchCommonFoods('banane')
    expect(results[0]?.id).toMatch(/^common:/)
  })

  it('every entry has a positive calorie value and a null brand', () => {
    // Sanity check on the whole hand-written dataset, not just one query.
    for (const food of searchCommonFoods('')) {
      expect(food.caloriesPer100g).toBeGreaterThan(0)
      expect(food.brand).toBeNull()
    }
  })
})
