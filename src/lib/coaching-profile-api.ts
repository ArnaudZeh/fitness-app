import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type CoachingProfile = Database['public']['Tables']['coaching_profile']['Row']

export type CoachingProfileInput = Partial<
  Omit<CoachingProfile, 'id' | 'created_at' | 'updated_at'>
>

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchCoachingProfile(): Promise<CoachingProfile> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('coaching_profile')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateCoachingProfile(
  patch: CoachingProfileInput,
): Promise<CoachingProfile> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('coaching_profile')
    .update(patch)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}
