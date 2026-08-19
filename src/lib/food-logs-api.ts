import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type FoodLog = Database['public']['Tables']['food_logs']['Row']

export interface FoodLogInput {
  meal_slot_id: string
  logged_date: string
  name: string
  quantity_g: number
  calories_per_100g: number
  protein_g_per_100g: number | null
  carbs_g_per_100g: number | null
  fat_g_per_100g: number | null
  // Computed totals for the logged quantity (per_100g * quantity_g / 100),
  // stored alongside the per-100g reference rather than derived at read
  // time — every other part of the app (progress bars, daily totals) just
  // sums these, no need to know about the per-100g shape at all.
  calories: number
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchFoodLogsForDate(loggedDate: string): Promise<FoodLog[]> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', loggedDate)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// Real calendar cutoff, not "the last N rows" — a sparse logging week
// shouldn't silently pull in entries from a month ago. Used to feed the
// couche IA nutrition context (see buildNutritionContext in nutrition-calc.ts).
export async function fetchFoodLogsSince(sinceDate: string): Promise<FoodLog[]> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_date', sinceDate)
    .order('logged_date', { ascending: true })
  if (error) throw error
  return data
}

export async function createFoodLog(input: FoodLogInput): Promise<FoodLog> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('food_logs')
    .insert({ ...input, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFoodLog(id: string): Promise<void> {
  const { error } = await supabase.from('food_logs').delete().eq('id', id)
  if (error) throw error
}

export interface RecentFoodLog {
  name: string
  caloriesPer100g: number
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
}

const RECENT_FOOD_LOGS_LIMIT = 8

// Quick-add source: the user's own most-recently-logged foods, deduplicated
// by name — reuses food_logs itself rather than a separate favorites table
// (see nutrition plan decisions in TODOS.md). Scanning the last 50 entries
// for 8 distinct names is a reasonable bound without an extra DB round trip
// per candidate.
export async function fetchRecentFoodLogNames(): Promise<RecentFoodLog[]> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('food_logs')
    .select('name, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g')
    .eq('user_id', userId)
    .not('calories_per_100g', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error

  const seenNames = new Set<string>()
  const recents: RecentFoodLog[] = []
  for (const row of data) {
    if (seenNames.has(row.name) || row.calories_per_100g === null) continue
    seenNames.add(row.name)
    recents.push({
      name: row.name,
      caloriesPer100g: row.calories_per_100g,
      proteinPer100g: row.protein_g_per_100g,
      carbsPer100g: row.carbs_g_per_100g,
      fatPer100g: row.fat_g_per_100g,
    })
    if (recents.length >= RECENT_FOOD_LOGS_LIMIT) break
  }
  return recents
}
