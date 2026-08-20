// OpenFoodFacts's public search API allows direct client-side calls
// (Access-Control-Allow-Origin: * confirmed on world.openfoodfacts.org) —
// no edge function proxy needed, unlike the CORS risk flagged when P2 was
// first scoped. Its nutriments are already expressed per 100g, the exact
// shape food_logs already stores (see 20260815120000_nutrition_activity_and_grammage.sql),
// so a search result maps directly onto the manual-entry fields with no
// extra conversion.
import type { FoodSearchResult } from '@/lib/food-search-result'

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product'

export interface OpenFoodFactsRawProduct {
  code?: string
  product_name?: string
  brands?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
  }
}

export interface OpenFoodFactsRawResponse {
  products?: OpenFoodFactsRawProduct[]
}

// OpenFoodFacts often stores energy converted from kJ (e.g. 101.577437858508
// kcal), far more precision than a nutrition label ever shows — rounding at
// the source keeps every consumer (search results, prefilled form fields)
// clean without each one needing to know to do it, and matches the
// numeric(7,1)/numeric(6,1) precision food_logs stores per-100g values at.
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

// Skips low-quality entries with no name or no calorie value — common in a
// community-edited database, and useless as a quick-add source either way.
// Kept pure/separate from the fetch call below so it's testable without
// mocking the network.
export function mapOpenFoodFactsResponse(data: OpenFoodFactsRawResponse): FoodSearchResult[] {
  const results: FoodSearchResult[] = []
  for (const product of data.products ?? []) {
    const caloriesPer100g = product.nutriments?.['energy-kcal_100g']
    if (!product.code || !product.product_name || typeof caloriesPer100g !== 'number') continue
    const proteinPer100g = product.nutriments?.proteins_100g
    const carbsPer100g = product.nutriments?.carbohydrates_100g
    const fatPer100g = product.nutriments?.fat_100g
    results.push({
      id: `off:${product.code}`,
      name: product.product_name,
      brand: product.brands?.trim() || null,
      caloriesPer100g: Math.round(caloriesPer100g),
      proteinPer100g: typeof proteinPer100g === 'number' ? roundToOneDecimal(proteinPer100g) : null,
      carbsPer100g: typeof carbsPer100g === 'number' ? roundToOneDecimal(carbsPer100g) : null,
      fatPer100g: typeof fatPer100g === 'number' ? roundToOneDecimal(fatPer100g) : null,
    })
  }
  return results
}

export interface OpenFoodFactsProductResponse {
  status?: number
  product?: OpenFoodFactsRawProduct
}

// Maps a single product lookup the same way mapOpenFoodFactsResponse maps a
// search hit — reuses the exact same field extraction/rounding rather than
// duplicating it, just wrapped for a single product instead of a list.
// Kept pure/separate from the fetch call, same testability reasoning as
// mapOpenFoodFactsResponse.
export function mapOpenFoodFactsProduct(
  data: OpenFoodFactsProductResponse,
): FoodSearchResult | null {
  if (!data.product) return null
  const [result] = mapOpenFoodFactsResponse({ products: [data.product] })
  return result ?? null
}

// Barcode lookup (product endpoint) rather than a text search — used by the
// barcode scanner. status:0 (verified live: real shape is
// {code,status,status_verbose} with no "product" key) means genuinely not
// referenced on OpenFoodFacts, not a network error, so this returns null
// rather than throwing — the caller falls back to the other entry methods
// (manual, or the photo-of-the-label option) instead of showing an error.
export async function fetchProductByBarcode(barcode: string): Promise<FoodSearchResult | null> {
  const response = await fetch(
    `${PRODUCT_URL}/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,nutriments`,
  )
  if (!response.ok) throw new Error('Recherche OpenFoodFacts indisponible pour le moment.')
  const data = (await response.json()) as OpenFoodFactsProductResponse
  return mapOpenFoodFactsProduct(data)
}

export async function searchOpenFoodFacts(query: string): Promise<FoodSearchResult[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '15',
    fields: 'code,product_name,brands,nutriments',
  })
  const response = await fetch(`${SEARCH_URL}?${params.toString()}`)
  if (!response.ok) throw new Error('Recherche OpenFoodFacts indisponible pour le moment.')
  const data = (await response.json()) as OpenFoodFactsRawResponse
  return mapOpenFoodFactsResponse(data)
}
