import { supabase } from '@/lib/supabase'
import { getSignedPhotoUrl } from '@/lib/posts-api'
import { getSignedAvatarUrl } from '@/lib/avatar-api'
import { fetchReactionSummary } from '@/lib/reactions-api'
import { fetchMentionsByContentId } from '@/lib/mentions-api'
import { mergeFeedEntries } from '@/lib/social-display'
import type { FeedEntry, MilestoneFeedEntry, PostFeedEntry } from '@/lib/social-display'

// friend_profile_details (not public_profiles) — every author appearing in
// the feed is either the current user or a friend (RLS on milestones/posts
// already guarantees this), so it's a strict upgrade: same name lookup,
// plus the avatar path this view exposes that public_profiles doesn't.
export async function fetchFeed(): Promise<FeedEntry[]> {
  const [
    { data: milestones, error: milestonesError },
    { data: posts, error: postsError },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from('milestones')
      .select('*, exercise:exercises(image_url)')
      .order('achieved_at', { ascending: false })
      .limit(50),
    supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.auth.getUser(),
  ])
  if (milestonesError) throw milestonesError
  if (postsError) throw postsError
  const currentUserId = user?.id ?? null

  const userIds = [
    ...new Set([...milestones.map((m) => m.user_id), ...posts.map((p) => p.user_id)]),
  ]
  const { data: profiles, error: profilesError } = await supabase
    .from('friend_profile_details')
    .select('id, display_name, avatar_path')
    .in('id', userIds)
  if (profilesError) throw profilesError

  const displayNameByUserId = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name ?? 'Utilisateur']),
  )
  const avatarUrlByUserId = new Map(
    await Promise.all(
      (profiles ?? []).map(async (p): Promise<[string, string | null]> => [
        p.id ?? '',
        p.avatar_path ? await getSignedAvatarUrl(p.avatar_path) : null,
      ]),
    ),
  )

  const [milestoneReactions, postReactions, postMentions] = await Promise.all([
    fetchReactionSummary(
      'milestone',
      milestones.map((m) => m.id),
      currentUserId,
    ),
    fetchReactionSummary(
      'post',
      posts.map((p) => p.id),
      currentUserId,
    ),
    fetchMentionsByContentId(
      'post',
      posts.map((p) => p.id),
    ),
  ])
  const emptyReactions = { likeCount: 0, likedByMe: false, commentCount: 0 }

  const milestoneEntries: MilestoneFeedEntry[] = milestones.map((milestone) => ({
    kind: 'milestone',
    id: milestone.id,
    userId: milestone.user_id,
    displayName: displayNameByUserId.get(milestone.user_id) ?? 'Utilisateur',
    avatarUrl: avatarUrlByUserId.get(milestone.user_id) ?? null,
    occurredAt: milestone.achieved_at,
    milestone,
    ...(milestoneReactions.get(milestone.id) ?? emptyReactions),
  }))

  const postEntries: PostFeedEntry[] = await Promise.all(
    posts.map(async (post) => ({
      kind: 'post' as const,
      id: post.id,
      userId: post.user_id,
      displayName: displayNameByUserId.get(post.user_id) ?? 'Utilisateur',
      avatarUrl: avatarUrlByUserId.get(post.user_id) ?? null,
      occurredAt: post.created_at,
      post,
      signedUrl: post.storage_path ? await getSignedPhotoUrl(post.storage_path) : null,
      mentions: postMentions.get(post.id) ?? [],
      ...(postReactions.get(post.id) ?? emptyReactions),
    })),
  )

  return mergeFeedEntries(milestoneEntries, postEntries)
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('milestones').delete().eq('id', id)
  if (error) throw error
}
