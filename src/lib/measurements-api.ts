import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type BodyMeasurement = Database['public']['Tables']['body_measurements']['Row']

export interface MeasurementInput {
  neckCm: number | null
  chestCm: number | null
  waistCm: number | null
  hipsCm: number | null
  armCm: number | null
  thighCm: number | null
  calfCm: number | null
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchMeasurements(): Promise<BodyMeasurement[]> {
  const userId = await requireUserId()
  // Explicit filter, not just RLS — same reason as weight_entries: the
  // friend-profile feature widens the SELECT policy to also allow reading
  // a friend's/public profile's rows, so relying on RLS alone here would
  // mix someone else's measurements into "my" history.
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
  if (error) throw error
  return data
}

// One entry per day, same as weight_entries: logging again for a day that
// already has an entry updates it in place. The caller is expected to have
// pre-filled `input` from that day's existing entry (if any) so partially
// re-logging one field doesn't null out the others.
export async function logMeasurement(
  input: MeasurementInput,
  recordedAt: string,
): Promise<BodyMeasurement> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('body_measurements')
    .upsert(
      {
        user_id: userId,
        recorded_at: recordedAt,
        neck_cm: input.neckCm,
        chest_cm: input.chestCm,
        waist_cm: input.waistCm,
        hips_cm: input.hipsCm,
        arm_cm: input.armCm,
        thigh_cm: input.thighCm,
        calf_cm: input.calfCm,
      },
      { onConflict: 'user_id,recorded_at' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMeasurement(id: string): Promise<void> {
  const { error } = await supabase.from('body_measurements').delete().eq('id', id)
  if (error) throw error
}
