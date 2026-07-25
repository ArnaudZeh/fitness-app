import { supabase } from '@/lib/supabase'
import { getSignedPhotoUrl } from '@/lib/posts-api'
import { fetchReactionSummary } from '@/lib/reactions-api'
import { fetchMentionsByContentId } from '@/lib/mentions-api'
import { mergeFeedEntries } from '@/lib/social-display'
import type { FeedEntry, MilestoneFeedEntry, PostFeedEntry } from '@/lib/social-display'

// public_profiles itself has no visibility restriction (needed so the
// friends search can find anyone by name) — RLS on milestones/posts is what
// actually limits this query to the current user's own entries and their
// friends'. A missing name lookup still falls back to a generic label.
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
    .from('public_profiles')
    .select('id, display_name')
    .in('id', userIds)
  if (profilesError) throw profilesError

  const displayNameByUserId = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name ?? 'Utilisateur']),
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
