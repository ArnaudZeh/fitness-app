import { supabase } from '@/lib/supabase'

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// P1 du follow asymétrique — le suivi n'est jamais exposé publiquement
// pour l'instant (voir TODOS.md, P2 s'en chargera), donc pas de récupération
// de "qui suit qui" au-delà de sa propre relation avec un profil donné.
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
