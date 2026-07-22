import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type WellnessActivity = Database['public']['Tables']['wellness_activities']['Row']
export type WellnessActivityLog =
  Database['public']['Tables']['wellness_activity_logs']['Row']

export interface WellnessActivityInput {
  name: string
  days_of_week: number[]
  reminder_time: string | null
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchWellnessActivities(): Promise<WellnessActivity[]> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('wellness_activities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createWellnessActivity(
  input: WellnessActivityInput,
): Promise<WellnessActivity> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('wellness_activities')
    .insert({ ...input, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWellnessActivity(
  id: string,
  patch: Partial<WellnessActivityInput & { active: boolean }>,
): Promise<WellnessActivity> {
  const { data, error } = await supabase
    .from('wellness_activities')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteWellnessActivity(id: string): Promise<void> {
  const { error } = await supabase.from('wellness_activities').delete().eq('id', id)
  if (error) throw error
}

export async function fetchWellnessActivityLogs(
  startDate: string,
  endDate: string,
): Promise<WellnessActivityLog[]> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('wellness_activity_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('completed_date', startDate)
    .lte('completed_date', endDate)
  if (error) throw error
  return data
}

export async function logWellnessActivity(
  activityId: string,
  date: string,
): Promise<WellnessActivityLog> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('wellness_activity_logs')
    .insert({ activity_id: activityId, completed_date: date, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function unlogWellnessActivity(
  activityId: string,
  date: string,
): Promise<void> {
  const userId = await requireUserId()
  const { error } = await supabase
    .from('wellness_activity_logs')
    .delete()
    .eq('activity_id', activityId)
    .eq('completed_date', date)
    .eq('user_id', userId)
  if (error) throw error
}
