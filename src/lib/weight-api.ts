import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type WeightEntry = Database['public']['Tables']['weight_entries']['Row']

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchWeightEntries(): Promise<WeightEntry[]> {
  const userId = await requireUserId()
  // Explicit filter, not just RLS: the friend-profile feature widened the
  // SELECT policy to also allow reading a friend's weight entries, so
  // relying on RLS alone here would mix a friend's weigh-ins into "my"
  // history/analytics.
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
  if (error) throw error
  return data
}

// One entry per day: logging again for a day that already has an entry
// updates it in place instead of creating a duplicate.
export async function logWeightEntry(
  weightKg: number,
  recordedAt: string,
): Promise<WeightEntry> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('weight_entries')
    .upsert(
      { user_id: userId, weight_kg: weightKg, recorded_at: recordedAt },
      { onConflict: 'user_id,recorded_at' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteWeightEntry(id: string): Promise<void> {
  const { error } = await supabase.from('weight_entries').delete().eq('id', id)
  if (error) throw error
}
