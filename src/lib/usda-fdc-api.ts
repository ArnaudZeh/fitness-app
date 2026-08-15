import { invokeEdgeFunction } from '@/lib/edge-function'
import type { FoodSearchResult } from '@/lib/food-search-result'

export interface FdcNutrient {
  nutrientNumber?: string
  unitName?: string
  value?: number
}

export interface FdcFood {
  fdcId?: number
  description?: string
  foodNutrients?: FdcNutrient[]
}

export interface FdcSearchResponse {
  foods?: FdcFood[]
}

// Standard USDA nutrient numbers (stable across FDC data types, unlike
// nutrientId). 208 ("Energy", kcal) is the classic field present on every
// SR Legacy food — but some newer "Foundation" entries omit it and only
// report Atwater-factor variants (957 "Energy (Atwater General Factors)"),
// found by inspecting a real response (raw chicken breast) rather than
// assuming the docs' happy path — falls back to 957 when 208 is absent.
const ENERGY_NUTRIENT_NUMBERS = ['208', '957']
const PROTEIN_NUTRIENT_NUMBER = '203'
const FAT_NUTRIENT_NUMBER = '204'
const CARBS_NUTRIENT_NUMBER = '205'

function findNutrientValue(nutrients: FdcNutrient[], numbers: string[]): number | null {
  for (const number of numbers) {
    const match = nutrients.find((nutrient) => nutrient.nutrientNumber === number)
    if (match && typeof match.value === 'number') return match.value
  }
  return null
}

function roundOrNull(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10
}

// Values are per 100g (FDC's standard reporting basis), same shape as
// OpenFoodFacts — no unit conversion needed. Kept pure/separate from the
// edge function call below so it's testable without mocking the network.
export function mapFdcResponse(data: FdcSearchResponse): FoodSearchResult[] {
  const results: FoodSearchResult[] = []
  for (const food of data.foods ?? []) {
    if (!food.fdcId || !food.description) continue
    const nutrients = food.foodNutrients ?? []
    const calories = findNutrientValue(nutrients, ENERGY_NUTRIENT_NUMBERS)
    if (calories === null) continue
    results.push({
      id: `usda:${food.fdcId}`,
      name: food.description,
      brand: null,
      caloriesPer100g: Math.round(calories),
      proteinPer100g: roundOrNull(findNutrientValue(nutrients, [PROTEIN_NUTRIENT_NUMBER])),
      carbsPer100g: roundOrNull(findNutrientValue(nutrients, [CARBS_NUTRIENT_NUMBER])),
      fatPer100g: roundOrNull(findNutrientValue(nutrients, [FAT_NUTRIENT_NUMBER])),
    })
  }
  return results
}

// Proxied through the usda-fdc-search edge function — the API key stays
// server-side (see supabase/functions/usda-fdc-search) rather than in the
// client bundle, unlike OpenFoodFacts which is fully keyless.
export async function searchUsdaFdc(query: string): Promise<FoodSearchResult[]> {
  const data = await invokeEdgeFunction<FdcSearchResponse>('usda-fdc-search', { query })
  return mapFdcResponse(data)
}
