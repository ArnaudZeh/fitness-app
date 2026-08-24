import { supabase } from '@/lib/supabase'

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// P2 — compteurs seulement (pas de liste nominative, voir TODOS.md). Les
// deux RPC renvoient null quand la cible n'est ni publique ni soi-même :
// traité comme "pas affiché" côté UI plutôt que 0, pour ne pas laisser
// croire que le compte a réellement 0 abonné alors que l'info est juste
// masquée.
export async function fetchFollowerCount(userId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('count_followers', { p_user_id: userId })
  if (error) throw error
  return data
}

export async function fetchFollowingCount(userId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('count_following', { p_user_id: userId })
  if (error) throw error
  return data
}

// P2 expose des compteurs agrégés (ci-dessus), jamais les lignes
// individuelles de follows — la policy select reste donc limitée à sa
// propre relation avec un profil donné (qui suit-on soi-même).
export async function fetchIsFollowing(followedId: string): Promise<boolean> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', userId)
    .eq('followed_id', followedId)
    .maybeSingle()
  if (error) throw error
  return data !== null
}

// La policy insert exige déjà que followedId soit public — une tentative
// sur un profil privé échoue avec une erreur RLS, jamais silencieusement.
export async function followUser(followedId: string): Promise<void> {
  const userId = await requireUserId()
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: userId, followed_id: followedId })
  if (error) throw error
}

export async function unfollowUser(followedId: string): Promise<void> {
  const userId = await requireUserId()
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('followed_id', followedId)
  if (error) throw error
}

export interface FollowSuggestion {
  id: string
  displayName: string
  followerCount: number
}

// P3 — profils publics pas déjà suivis ni déjà amis, classés par nombre
// d'abonnés (signal simple de "compte public actif", pas de
// recommandation par affinité pour ce premier tour).
export async function fetchFollowSuggestions(limit = 10): Promise<FollowSuggestion[]> {
  const { data, error } = await supabase.rpc('get_follow_suggestions', { p_limit: limit })
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    displayName: row.display_name ?? 'Utilisateur',
    followerCount: row.follower_count,
  }))
}
