import { supabase } from '@/lib/supabase'
import { getSignedAvatarUrl } from '@/lib/avatar-api'

export interface UserSearchResult {
  id: string
  displayName: string
}

export interface FriendEntry {
  friendshipId: string
  userId: string
  displayName: string
  avatarUrl: string | null
}

export interface FriendsData {
  friends: FriendEntry[]
  incomingRequests: FriendEntry[]
  outgoingRequests: FriendEntry[]
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed === '') return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, display_name')
    .ilike('display_name', `%${trimmed}%`)
    .neq('id', user.id)
    .limit(20)
  if (error) throw error

  return (data ?? [])
    .filter((p): p is { id: string; display_name: string | null } => p.id !== null)
    .map((p) => ({ id: p.id, displayName: p.display_name ?? 'Utilisateur' }))
}

export async function fetchFriendsData(): Promise<FriendsData> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const currentUserId = user.id

  const { data: rows, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .order('created_at', { ascending: false })
  if (error) throw error

  const otherUserIds = [
    ...new Set(
      (rows ?? []).map((r) => (r.requester_id === currentUserId ? r.addressee_id : r.requester_id)),
    ),
  ]
  const { data: profiles, error: profilesError } = await supabase
    .from('public_profiles')
    .select('id, display_name')
    .in('id', otherUserIds)
  if (profilesError) throw profilesError
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? 'Utilisateur']))

  // friend_profile_details only returns a row for someone who's already an
  // accepted friend (or self) — a still-pending request simply won't have
  // one, which is fine: those entries just get no avatar rather than an
  // error, since they can't be resolved to a signed URL either way yet.
  const { data: details, error: detailsError } = await supabase
    .from('friend_profile_details')
    .select('id, avatar_path')
    .in('id', otherUserIds)
  if (detailsError) throw detailsError
  const avatarUrlById = new Map(
    await Promise.all(
      (details ?? []).map(async (d): Promise<[string, string | null]> => [
        d.id ?? '',
        d.avatar_path ? await getSignedAvatarUrl(d.avatar_path) : null,
      ]),
    ),
  )

  const friends: FriendEntry[] = []
  const incomingRequests: FriendEntry[] = []
  const outgoingRequests: FriendEntry[] = []

  for (const row of rows ?? []) {
    const otherId = row.requester_id === currentUserId ? row.addressee_id : row.requester_id
    const entry: FriendEntry = {
      friendshipId: row.id,
      userId: otherId,
      displayName: nameById.get(otherId) ?? 'Utilisateur',
      avatarUrl: avatarUrlById.get(otherId) ?? null,
    }
    if (row.status === 'accepted') {
      friends.push(entry)
    } else if (row.addressee_id === currentUserId) {
      incomingRequests.push(entry)
    } else {
      outgoingRequests.push(entry)
    }
  }

  return { friends, incomingRequests, outgoingRequests }
}

export async function sendFriendRequest(addresseeId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: addresseeId })
  if (error) throw error
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
  if (error) throw error
}

// Covers three cases with the same operation: cancelling a request you
// sent, declining one you received, and unfriending someone — all just
// remove the row (no separate "declined" status to track).
export async function removeFriendship(friendshipId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
  if (error) throw error
}
