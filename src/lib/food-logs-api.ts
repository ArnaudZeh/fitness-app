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
