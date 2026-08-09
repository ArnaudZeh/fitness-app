import { supabase } from '@/lib/supabase'
import { getSignedAvatarUrl } from '@/lib/avatar-api'
import type { Goal } from '@/lib/profile-api'
import type { ProgramFocus } from '@/lib/programs-api'

export interface FriendProfile {
  id: string
  displayName: string
  avatarUrl: string | null
  age: number | null
  goal: Goal | null
  recentWeights: { weightKg: number; recordedAt: string }[]
  recentMeasurements: {
    recordedAt: string
    neckCm: number | null
    chestCm: number | null
    waistCm: number | null
    hipsCm: number | null
    armCm: number | null
    thighCm: number | null
    calfCm: number | null
  }[]
  activeProgram: { id: string; name: string; focus: ProgramFocus } | null
  // Gates the "voir en détail" link on FriendProfilePage: can_view_program_details()
  // only opens session_templates/session_template_exercises for the owner
  // or a public profile — never a plain (non-public) friend — so a friend
  // who isn't public would otherwise land on a program page with every
  // day filtered out by RLS.
  isPublic: boolean
}

// Thrown instead of a generic Postgrest error when `friend_profile_details`
// returns no row — happens both for a userId that doesn't exist and for a
// real user whose profile just isn't visible to the caller (not a friend,
// not public). The UI shows "ce profil est privé" for this case rather than
// a scary generic error.
export class ProfileNotVisibleError extends Error {
  constructor() {
    super('Ce profil est privé ou introuvable.')
    this.name = 'ProfileNotVisibleError'
  }
}

const RECENT_WEIGHTS_LIMIT = 5
const RECENT_MEASUREMENTS_LIMIT = 5

// Four independent, RLS-gated reads rather than one bespoke view — each
// already has its own visibility policy (are_friends()/is_profile_public()
// on weight_entries/body_measurements/programs, friend_profile_details for
// the rest), so
// there's nothing extra to guard here. Works identically for an accepted
// friend or a non-friend with a public profile — the RLS decides, this
// function doesn't need to know which case it is.
export async function fetchFriendProfile(userId: string): Promise<FriendProfile> {
  const [
    { data: details, error: detailsError },
    { data: weights, error: weightsError },
    { data: measurements, error: measurementsError },
    { data: programs, error: programsError },
  ] = await Promise.all([
    supabase.from('friend_profile_details').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('weight_entries')
      .select('weight_kg, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(RECENT_WEIGHTS_LIMIT),
    supabase
      .from('body_measurements')
      .select(
        'recorded_at, neck_cm, chest_cm, waist_cm, hips_cm, arm_cm, thigh_cm, calf_cm',
      )
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(RECENT_MEASUREMENTS_LIMIT),
    supabase
      .from('programs')
      .select('id, name, focus')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ])
  if (detailsError) throw detailsError
  if (weightsError) throw weightsError
  if (measurementsError) throw measurementsError
  if (programsError) throw programsError
  if (!details) throw new ProfileNotVisibleError()

  const avatarUrl = details.avatar_path
    ? await getSignedAvatarUrl(details.avatar_path)
    : null
  const activeProgram = programs?.[0]

  return {
    id: userId,
    displayName: details.display_name ?? 'Utilisateur',
    avatarUrl,
    age: details.age,
    goal: details.goal as Goal | null,
    recentWeights: (weights ?? []).map((w) => ({
      weightKg: w.weight_kg,
      recordedAt: w.recorded_at,
    })),
    recentMeasurements: (measurements ?? []).map((m) => ({
      recordedAt: m.recorded_at,
      neckCm: m.neck_cm,
      chestCm: m.chest_cm,
      waistCm: m.waist_cm,
      hipsCm: m.hips_cm,
      armCm: m.arm_cm,
      thighCm: m.thigh_cm,
      calfCm: m.calf_cm,
    })),
    activeProgram: activeProgram
      ? {
          id: activeProgram.id,
          name: activeProgram.name,
          focus: activeProgram.focus as ProgramFocus,
        }
      : null,
    isPublic: details.is_public ?? false,
  }
}
