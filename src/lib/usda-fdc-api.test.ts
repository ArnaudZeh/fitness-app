import { describe, expect, it } from 'vitest'
import { mapFdcResponse, type FdcSearchResponse } from '@/lib/usda-fdc-api'

describe('mapFdcResponse', () => {
  it('maps an SR Legacy food using the plain Energy (208) field', () => {
    // Trimmed from a real /foods/search response for "chicken breast raw".
    const data: FdcSearchResponse = {
      foods: [
        {
          fdcId: 171077,
          description: 'Chicken, broilers or fryers, breast, meat and skin, raw',
          foodNutrients: [
            { nutrientNumber: '203', unitName: 'G', value: 20.8 },
            { nutrientNumber: '204', unitName: 'G', value: 9.25 },
            { nutrientNumber: '205', unitName: 'G', value: 0 },
            { nutrientNumber: '208', unitName: 'KCAL', value: 172 },
          ],
        },
      ],
    }
    expect(mapFdcResponse(data)).toEqual([
      {
        id: 'usda:171077',
        name: 'Chicken, broilers or fryers, breast, meat and skin, raw',
        brand: null,
        caloriesPer100g: 172,
        proteinPer100g: 20.8,
        carbsPer100g: 0,
        fatPer100g: 9.3,
      },
    ])
  })

  it('falls back to Energy (Atwater General Factors, 957) when 208 is absent', () => {
    // Real quirk found by testing live: some "Foundation" foods (e.g. raw
    // chicken breast, fdcId 2646170) skip the plain Energy field entirely.
    const data: FdcSearchResponse = {
      foods: [
        {
          fdcId: 2646170,
          description: 'Chicken, breast, boneless, skinless, raw',
          foodNutrients: [
            { nutrientNumber: '203', unitName: 'G', value: 22.5 },
            { nutrientNumber: '204', unitName: 'G', value: 1.93 },
            { nutrientNumber: '205', unitName: 'G', value: 0 },
            { nutrientNumber: '957', unitName: 'KCAL', value: 106 },
            { nutrientNumber: '958', unitName: 'KCAL', value: 112 },
          ],
        },
      ],
    }
    const result = mapFdcResponse(data)
    expect(result).toHaveLength(1)
    expect(result[0]?.caloriesPer100g).toBe(106)
  })

  it('skips foods with no fdcId, no description, or no usable energy value', () => {
    const data: FdcSearchResponse = {
      foods: [
        { description: 'Sans fdcId', foodNutrients: [{ nutrientNumber: '208', value: 100 }] },
        { fdcId: 1, foodNutrients: [{ nutrientNumber: '208', value: 100 }] },
        { fdcId: 2, description: 'Sans énergie', foodNutrients: [{ nutrientNumber: '203', value: 5 }] },
      ],
    }
    expect(mapFdcResponse(data)).toEqual([])
  })

  it('returns an empty array when the response has no foods field', () => {
    expect(mapFdcResponse({})).toEqual([])
  })
})
