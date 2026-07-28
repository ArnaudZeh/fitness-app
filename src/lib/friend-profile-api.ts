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
  activeProgram: { id: string; name: string; focus: ProgramFocus } | null
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

// Three independent, RLS-gated reads rather than one bespoke view — each
// already has its own visibility policy (are_friends()/is_profile_public()
// on weight_entries/programs, friend_profile_details for the rest), so
// there's nothing extra to guard here. Works identically for an accepted
// friend or a non-friend with a public profile — the RLS decides, this
// function doesn't need to know which case it is.
export async function fetchFriendProfile(userId: string): Promise<FriendProfile> {
  const [
    { data: details, error: detailsError },
    { data: weights, error: weightsError },
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
      .from('programs')
      .select('id, name, focus')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ])
  if (detailsError) throw detailsError
  if (weightsError) throw weightsError
  if (programsError) throw programsError
  if (!details) throw new ProfileNotVisibleError()

  const avatarUrl = details.avatar_path ? await getSignedAvatarUrl(details.avatar_path) : null
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
    activeProgram: activeProgram
      ? { id: activeProgram.id, name: activeProgram.name, focus: activeProgram.focus as ProgramFocus }
      : null,
  }
}
