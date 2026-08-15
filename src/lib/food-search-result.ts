// Shared shape across every food search source (OpenFoodFacts, the curated
// generic-foods list, USDA FoodData Central) — lets the search UI merge and
// render results from all three identically, without knowing which source
// each one came from.
export interface FoodSearchResult {
  id: string
  name: string
  brand: string | null
  caloriesPer100g: number
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
}
