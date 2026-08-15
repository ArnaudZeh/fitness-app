import { describe, expect, it } from 'vitest'
import { mapOpenFoodFactsResponse, type OpenFoodFactsRawResponse } from '@/lib/openfoodfacts-api'

describe('mapOpenFoodFactsResponse', () => {
  it('maps a well-formed product to a result', () => {
    const data: OpenFoodFactsRawResponse = {
      products: [
        {
          code: '123',
          product_name: 'Riz basmati',
          brands: 'Taureau Ailé',
          nutriments: {
            'energy-kcal_100g': 353,
            proteins_100g: 8.1,
            carbohydrates_100g: 78,
            fat_100g: 0.8,
          },
        },
      ],
    }
    expect(mapOpenFoodFactsResponse(data)).toEqual([
      {
        id: 'off:123',
        name: 'Riz basmati',
        brand: 'Taureau Ailé',
        caloriesPer100g: 353,
        proteinPer100g: 8.1,
        carbsPer100g: 78,
        fatPer100g: 0.8,
      },
    ])
  })

  it('skips products with no barcode', () => {
    const data: OpenFoodFactsRawResponse = {
      products: [
        { product_name: 'Sans code-barre', nutriments: { 'energy-kcal_100g': 100 } },
      ],
    }
    expect(mapOpenFoodFactsResponse(data)).toEqual([])
  })

  it('skips products with no name', () => {
    const data: OpenFoodFactsRawResponse = {
      products: [{ code: '456', nutriments: { 'energy-kcal_100g': 100 } }],
    }
    expect(mapOpenFoodFactsResponse(data)).toEqual([])
  })

  it('skips products with no calorie value', () => {
    const data: OpenFoodFactsRawResponse = {
      products: [{ code: '789', product_name: 'Sans calories', nutriments: {} }],
    }
    expect(mapOpenFoodFactsResponse(data)).toEqual([])
  })

  it('treats an empty or blank brand as null', () => {
    const data: OpenFoodFactsRawResponse = {
      products: [
        {
          code: '111',
          product_name: 'Sans marque',
          brands: '  ',
          nutriments: { 'energy-kcal_100g': 50 },
        },
      ],
    }
    expect(mapOpenFoodFactsResponse(data)[0]?.brand).toBeNull()
  })

  it('returns an empty array when the response has no products field', () => {
    expect(mapOpenFoodFactsResponse({})).toEqual([])
  })

  it('rounds calories to the nearest whole number and macros to one decimal', () => {
    // Real OpenFoodFacts values are often converted from kJ and carry far
    // more precision than any label ever shows.
    const data: OpenFoodFactsRawResponse = {
      products: [
        {
          code: '222',
          product_name: 'Blanc de Poulet',
          nutriments: {
            'energy-kcal_100g': 101.577437858508,
            proteins_100g: 21.049999999999997,
            carbohydrates_100g: 0.45,
            fat_100g: 1.649999999999999,
          },
        },
      ],
    }
    expect(mapOpenFoodFactsResponse(data)[0]).toEqual({
      id: 'off:222',
      name: 'Blanc de Poulet',
      brand: null,
      caloriesPer100g: 102,
      proteinPer100g: 21,
      carbsPer100g: 0.5,
      fatPer100g: 1.6,
    })
  })
})
