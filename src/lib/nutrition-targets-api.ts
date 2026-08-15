import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { ActivityLevel } from '@/lib/nutrition-calc'

type NutritionTargetsRow = Database['public']['Tables']['nutrition_targets']['Row']

export interface NutritionTargets extends Omit<NutritionTargetsRow, 'activity_level'> {
  activity_level: ActivityLevel | null
}

export interface NutritionTargetsInput {
  activity_level: ActivityLevel | null
  calories_target: number | null
  protein_g_target: number | null
  carbs_g_target: number | null
  fat_g_target: number | null
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// The row always exists — created by handle_new_user at signup (see
// 20260814120000_nutrition_p0.sql) — so this is a plain read, never an
// insert-then-update dance, same as coaching_profile.
export async function fetchNutritionTargets(): Promise<NutritionTargets> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('nutrition_targets')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data as NutritionTargets
}

export async function updateNutritionTargets(
  patch: Partial<NutritionTargetsInput>,
): Promise<NutritionTargets> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('nutrition_targets')
    .update(patch)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data as NutritionTargets
}
