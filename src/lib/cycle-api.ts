import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type CycleEntry = Database['public']['Tables']['cycle_entries']['Row']

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchCycleEntries(): Promise<CycleEntry[]> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('cycle_entries')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: true })
  if (error) throw error
  return data
}

export async function createCycleEntry(startDate: string): Promise<CycleEntry> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('cycle_entries')
    .insert({ start_date: startDate, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCycleEntry(id: string, startDate: string): Promise<CycleEntry> {
  const { data, error } = await supabase
    .from('cycle_entries')
    .update({ start_date: startDate })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCycleEntry(id: string): Promise<void> {
  const { error } = await supabase.from('cycle_entries').delete().eq('id', id)
  if (error) throw error
}
