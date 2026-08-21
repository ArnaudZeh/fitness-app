import { describe, expect, it } from 'vitest'
import { searchCommonDishes } from '@/lib/common-dishes'

describe('searchCommonDishes', () => {
  it('finds a match by substring', () => {
    const results = searchCommonDishes('poulet')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((dish) => dish.name.toLowerCase().includes('poulet'))).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(searchCommonDishes('POULET').length).toBe(searchCommonDishes('poulet').length)
  })

  it('is accent-insensitive', () => {
    // "Salade César" only matches if the accent is stripped from both the
    // query and the stored name before comparing.
    expect(searchCommonDishes('cesar').length).toBeGreaterThan(0)
  })

  it('returns an empty array for no match', () => {
    expect(searchCommonDishes('licorne')).toEqual([])
  })

  it('prefixes ids so they cannot collide with the per-100g food lists', () => {
    const results = searchCommonDishes('sandwich')
    expect(results[0]?.id).toMatch(/^dish:/)
  })

  it('every entry has a positive calorie value and non-negative macros', () => {
    for (const dish of searchCommonDishes('')) {
      expect(dish.calories).toBeGreaterThan(0)
      expect(dish.proteinG).toBeGreaterThanOrEqual(0)
      expect(dish.carbsG).toBeGreaterThanOrEqual(0)
      expect(dish.fatG).toBeGreaterThanOrEqual(0)
    }
  })
})
