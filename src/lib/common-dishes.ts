import { normalizeSearchText } from '@/lib/text-normalize'

export interface CommonDish {
  id: string
  name: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

interface CommonDishData {
  name: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

// P4 of the nutrition plan ("portions pré-établies"): whole composed
// dishes/plates as fixed totals, not per-100g references — a one-tap
// quick-add distinct from the per-100g search/scan/photo flows in
// FoodEntryTabs, for the common case of eating a full plate rather than
// building it up ingredient by ingredient. Values are realistic estimates
// for a typical single-portion serving, derived from the same reference
// composition figures as common-foods.ts, not a live per-user recipe —
// same "flat, small, hand-picked, easy to extend by hand" precedent (see
// feedback_simplicity_over_theoretical_structure in project memory).
const COMMON_DISHES: CommonDishData[] = [
  // Petit-déjeuner
  { name: "Bol d'avoine, banane & beurre de cacahuète", calories: 450, proteinG: 16, carbsG: 60, fatG: 16 },
  { name: 'Omelette (3 œufs) & pain complet', calories: 400, proteinG: 27, carbsG: 26, fatG: 20 },
  { name: 'Yaourt grec, granola & fruits rouges', calories: 340, proteinG: 17, carbsG: 34, fatG: 9 },
  { name: 'Smoothie protéiné banane', calories: 340, proteinG: 34, carbsG: 42, fatG: 6 },

  // Repas
  { name: 'Poulet grillé, riz & brocoli', calories: 540, proteinG: 55, carbsG: 63, fatG: 6 },
  { name: 'Steak haché, pâtes & tomates', calories: 620, proteinG: 47, carbsG: 54, fatG: 25 },
  { name: 'Saumon, quinoa & légumes verts', calories: 510, proteinG: 41, carbsG: 35, fatG: 23 },
  { name: 'Bol poke thon, riz & avocat', calories: 500, proteinG: 38, carbsG: 61, fatG: 11 },
  { name: 'Salade César au poulet', calories: 440, proteinG: 47, carbsG: 14, fatG: 21 },
  { name: 'Wrap poulet & crudités', calories: 420, proteinG: 38, carbsG: 36, fatG: 13 },
  { name: 'Chili con carne & riz', calories: 660, proteinG: 56, carbsG: 78, fatG: 12 },
  { name: 'Curry de poulet, riz basmati', calories: 700, proteinG: 54, carbsG: 58, fatG: 24 },
  { name: 'Pâtes bolognaise', calories: 650, proteinG: 46, carbsG: 70, fatG: 23 },
  { name: 'Couscous poulet & légumes', calories: 550, proteinG: 51, carbsG: 65, fatG: 7 },
  { name: 'Tacos bœuf (3 pièces)', calories: 620, proteinG: 41, carbsG: 45, fatG: 30 },

  // Léger / snack
  { name: 'Sandwich jambon-fromage', calories: 370, proteinG: 21, carbsG: 40, fatG: 14 },
]

export function searchCommonDishes(query: string): CommonDish[] {
  const normalizedQuery = normalizeSearchText(query)
  return COMMON_DISHES.filter((dish) => normalizeSearchText(dish.name).includes(normalizedQuery)).map(
    (dish) => ({ ...dish, id: `dish:${dish.name}` }),
  )
}
