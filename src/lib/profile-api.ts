import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type Sex = 'homme' | 'femme' | 'autre'
export type Goal =
  'perte_de_poids' | 'prise_de_muscle' | 'recomposition' | 'performance' | 'maintien'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export interface Profile extends Omit<ProfileRow, 'sex' | 'goal'> {
  sex: Sex | null
  goal: Goal | null
}

export interface ProfileInput {
  display_name: string | null
  date_of_birth: string | null
  sex: Sex | null
  height_cm: number | null
  goal: Goal | null
  target_weight_kg: number | null
  cycle_module_enabled: boolean
  is_public: boolean
}

export const SEX_LABELS: Record<Sex, string> = {
  homme: 'Homme',
  femme: 'Femme',
  autre: 'Autre',
}

export const GOAL_LABELS: Record<Goal, string> = {
  perte_de_poids: 'Perte de poids',
  prise_de_muscle: 'Prise de muscle',
  recomposition: 'Recomposition',
  performance: 'Performance',
  maintien: 'Maintien',
}

function toProfile(row: ProfileRow): Profile {
  return { ...row, sex: row.sex as Sex | null, goal: row.goal as Goal | null }
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchProfile(): Promise<Profile> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return toProfile(data)
}

export async function updateProfile(patch: Partial<ProfileInput>): Promise<Profile> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return toProfile(data)
}

// Silent best-effort sync, called once per app load (see AppLayout) — the
// wellness reminder scheduler needs profiles.timezone to convert a user's
// local reminder_time to UTC, and re-detecting on every visit keeps it
// correct across travel without any settings UI for it.
export async function syncTimezone(): Promise<void> {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .single()
  if (error) throw error
  if (data.timezone === detected) return
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ timezone: detected })
    .eq('id', userId)
  if (updateError) throw updateError
}
