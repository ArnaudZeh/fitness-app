import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type FoodLog = Database['public']['Tables']['food_logs']['Row']

export interface FoodLogInput {
  meal_slot_id: string
  logged_date: string
  name: string
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
