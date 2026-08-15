import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type MealSlot = Database['public']['Tables']['meal_slots']['Row']

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function isForeignKeyViolation(error: { code?: string } | null): boolean {
  return error?.code === '23503'
}

export async function fetchMealSlots(): Promise<MealSlot[]> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('meal_slots')
    .select('*')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data
}

export async function createMealSlot(name: string, orderIndex: number): Promise<MealSlot> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('meal_slots')
    .insert({ user_id: userId, name, order_index: orderIndex })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function renameMealSlot(id: string, name: string): Promise<MealSlot> {
  const { data, error } = await supabase
    .from('meal_slots')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// A slot with logged history can't be hard-deleted (food_logs.meal_slot_id
// references it without cascade, see 20260814120000_nutrition_p0.sql) — the
// delete falls back to archiving it instead of surfacing the FK error to
// the user, same handling as offline-sync.ts's own 23503 check. A slot
// never used stays fully removable.
export async function removeMealSlot(id: string): Promise<void> {
  const { error } = await supabase.from('meal_slots').delete().eq('id', id)
  if (!error) return
  if (!isForeignKeyViolation(error)) throw error
  const { error: archiveError } = await supabase
    .from('meal_slots')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (archiveError) throw archiveError
}
