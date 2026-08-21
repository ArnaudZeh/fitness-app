import type { FoodSearchResult } from '@/lib/food-search-result'
import { normalizeSearchText } from '@/lib/text-normalize'

interface CommonFood {
  name: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
}

// Fills the gap both OpenFoodFacts (packaged/barcoded products) and USDA
// FDC (mostly English, US-centric naming) leave for everyday French
// searches of plain, unbranded foods — "riz cuit", "1 œuf", raw/cooked
// meats, common fruits & vegetables. Values are standard reference figures
// (CIQUAL/USDA composition tables for the closest matching preparation),
// not tied to any specific product. Deliberately a flat, small, hand-picked
// list rather than a bigger imported dataset — see
// feedback_simplicity_over_theoretical_structure in project memory — easy
// to extend by hand if a common gap shows up again.
const COMMON_FOODS: CommonFood[] = [
  // Viandes, poissons, œufs
  { name: 'Blanc de poulet cru', caloriesPer100g: 110, proteinPer100g: 23, carbsPer100g: 0, fatPer100g: 1.6 },
  { name: 'Blanc de poulet cuit (grillé)', caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
  { name: "Cuisse de poulet cuite, sans peau", caloriesPer100g: 177, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 7.8 },
  { name: 'Dinde, filet cuit', caloriesPer100g: 135, proteinPer100g: 29, carbsPer100g: 0, fatPer100g: 1.5 },
  { name: 'Steak haché 5% MG cuit', caloriesPer100g: 172, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 7 },
  { name: 'Steak haché 15% MG cuit', caloriesPer100g: 227, proteinPer100g: 24, carbsPer100g: 0, fatPer100g: 15 },
  { name: 'Saumon cuit', caloriesPer100g: 208, proteinPer100g: 22, carbsPer100g: 0, fatPer100g: 13 },
  { name: 'Cabillaud cuit', caloriesPer100g: 105, proteinPer100g: 23, carbsPer100g: 0, fatPer100g: 1 },
  { name: 'Thon au naturel (boîte, égoutté)', caloriesPer100g: 116, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 1 },
  { name: 'Crevettes cuites', caloriesPer100g: 99, proteinPer100g: 21, carbsPer100g: 0.2, fatPer100g: 1.2 },
  { name: 'Jambon blanc', caloriesPer100g: 107, proteinPer100g: 20, carbsPer100g: 1, fatPer100g: 3 },
  { name: 'Œuf entier', caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11 },
  { name: "Blanc d'œuf", caloriesPer100g: 52, proteinPer100g: 11, carbsPer100g: 0.7, fatPer100g: 0.2 },

  // Féculents (cuits)
  { name: 'Riz blanc cuit', caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 },
  { name: 'Riz complet cuit', caloriesPer100g: 123, proteinPer100g: 2.6, carbsPer100g: 25, fatPer100g: 1 },
  { name: 'Pâtes cuites', caloriesPer100g: 131, proteinPer100g: 5, carbsPer100g: 25, fatPer100g: 1.1 },
  { name: 'Pomme de terre cuite (vapeur)', caloriesPer100g: 86, proteinPer100g: 1.7, carbsPer100g: 20, fatPer100g: 0.1 },
  { name: 'Patate douce cuite', caloriesPer100g: 90, proteinPer100g: 2, carbsPer100g: 21, fatPer100g: 0.1 },
  { name: 'Quinoa cuit', caloriesPer100g: 120, proteinPer100g: 4.4, carbsPer100g: 21, fatPer100g: 1.9 },
  { name: 'Pain blanc', caloriesPer100g: 265, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2 },
  { name: 'Pain complet', caloriesPer100g: 247, proteinPer100g: 10, carbsPer100g: 41, fatPer100g: 3.4 },
  { name: "Flocons d'avoine", caloriesPer100g: 375, proteinPer100g: 13, carbsPer100g: 60, fatPer100g: 7 },

  // Légumineuses (cuites)
  { name: 'Lentilles cuites', caloriesPer100g: 116, proteinPer100g: 9, carbsPer100g: 20, fatPer100g: 0.4 },
  { name: 'Pois chiches cuits', caloriesPer100g: 164, proteinPer100g: 8.9, carbsPer100g: 27, fatPer100g: 2.6 },
  { name: 'Haricots rouges cuits', caloriesPer100g: 127, proteinPer100g: 8.7, carbsPer100g: 23, fatPer100g: 0.5 },

  // Légumes
  { name: 'Brocoli cru', caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 7, fatPer100g: 0.4 },
  { name: 'Carotte crue', caloriesPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 10, fatPer100g: 0.2 },
  { name: 'Tomate', caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2 },
  { name: 'Courgette', caloriesPer100g: 17, proteinPer100g: 1.2, carbsPer100g: 3.1, fatPer100g: 0.3 },
  { name: 'Épinards crus', caloriesPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4 },
  { name: 'Salade verte', caloriesPer100g: 15, proteinPer100g: 1.4, carbsPer100g: 2.9, fatPer100g: 0.2 },
  { name: 'Poivron', caloriesPer100g: 31, proteinPer100g: 1, carbsPer100g: 6, fatPer100g: 0.3 },
  { name: 'Concombre', caloriesPer100g: 15, proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1 },
  { name: 'Haricots verts cuits', caloriesPer100g: 31, proteinPer100g: 1.8, carbsPer100g: 7, fatPer100g: 0.1 },
  { name: 'Champignon de Paris cru', caloriesPer100g: 22, proteinPer100g: 3.1, carbsPer100g: 3.3, fatPer100g: 0.3 },

  // Fruits
  { name: 'Banane', caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3 },
  { name: 'Pomme', caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2 },
  { name: 'Orange', caloriesPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 12, fatPer100g: 0.1 },
  { name: 'Fraises', caloriesPer100g: 32, proteinPer100g: 0.7, carbsPer100g: 7.7, fatPer100g: 0.3 },
  { name: 'Raisin', caloriesPer100g: 69, proteinPer100g: 0.7, carbsPer100g: 18, fatPer100g: 0.2 },
  { name: 'Avocat', caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 8.5, fatPer100g: 15 },
  { name: 'Kiwi', caloriesPer100g: 61, proteinPer100g: 1.1, carbsPer100g: 15, fatPer100g: 0.5 },
  { name: 'Ananas', caloriesPer100g: 50, proteinPer100g: 0.5, carbsPer100g: 13, fatPer100g: 0.1 },

  // Produits laitiers
  { name: 'Yaourt nature', caloriesPer100g: 61, proteinPer100g: 3.5, carbsPer100g: 4.7, fatPer100g: 3.3 },
  { name: 'Fromage blanc 20%', caloriesPer100g: 78, proteinPer100g: 7.5, carbsPer100g: 4, fatPer100g: 3 },
  { name: 'Skyr', caloriesPer100g: 66, proteinPer100g: 10, carbsPer100g: 4, fatPer100g: 0.2 },
  { name: 'Lait demi-écrémé', caloriesPer100g: 46, proteinPer100g: 3.3, carbsPer100g: 4.8, fatPer100g: 1.6 },
  { name: 'Emmental', caloriesPer100g: 380, proteinPer100g: 28, carbsPer100g: 0, fatPer100g: 30 },
  { name: 'Mozzarella', caloriesPer100g: 280, proteinPer100g: 22, carbsPer100g: 2, fatPer100g: 20 },

  // Matières grasses & oléagineux
  { name: "Huile d'olive", caloriesPer100g: 900, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100 },
  { name: 'Beurre', caloriesPer100g: 717, proteinPer100g: 0.9, carbsPer100g: 0.1, fatPer100g: 81 },
  { name: 'Amandes', caloriesPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 50 },
  { name: 'Noix', caloriesPer100g: 654, proteinPer100g: 15, carbsPer100g: 14, fatPer100g: 65 },
  { name: 'Beurre de cacahuète', caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50 },
]

export function searchCommonFoods(query: string): FoodSearchResult[] {
  const normalizedQuery = normalizeSearchText(query)
  return COMMON_FOODS.filter((food) =>
    normalizeSearchText(food.name).includes(normalizedQuery),
  ).map(
    (food) => ({
      id: `common:${food.name}`,
      name: food.name,
      brand: null,
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
    }),
  )
}
