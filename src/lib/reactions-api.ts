import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { FeedReactions, FeedTargetType } from '@/lib/social-display'

export type FeedComment = Database['public']['Tables']['feed_comments']['Row']
export interface FeedCommentWithAuthor extends FeedComment {
  displayName: string
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// One row per target, defaulting to zero reactions — callers always get an
// entry for every id passed in, never a sparse map to guard against.
export async function fetchReactionSummary(
  targetType: FeedTargetType,
  targetIds: string[],
  currentUserId: string | null,
): Promise<Map<string, FeedReactions>> {
  const summary = new Map<string, FeedReactions>(
    targetIds.map((id) => [id, { likeCount: 0, likedByMe: false, commentCount: 0 }]),
  )
  if (targetIds.length === 0) return summary

  const [{ data: likes, error: likesError }, { data: comments, error: commentsError }] =
    await Promise.all([
      supabase
        .from('feed_likes')
        .select('target_id, user_id')
        .eq('target_type', targetType)
        .in('target_id', targetIds),
      supabase
        .from('feed_comments')
        .select('target_id')
        .eq('target_type', targetType)
        .in('target_id', targetIds),
    ])
  if (likesError) throw likesError
  if (commentsError) throw commentsError

  for (const like of likes) {
    const entry = summary.get(like.target_id)
    if (!entry) continue
    entry.likeCount += 1
    if (like.user_id === currentUserId) entry.likedByMe = true
  }
  for (const comment of comments) {
    const entry = summary.get(comment.target_id)
    if (entry) entry.commentCount += 1
  }
  return summary
}

export async function toggleLike(
  targetType: FeedTargetType,
  targetId: string,
  currentlyLiked: boolean,
): Promise<void> {
  const userId = await requireUserId()
  if (currentlyLiked) {
    const { error } = await supabase
      .from('feed_likes')
      .delete()
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('feed_likes')
    .insert({ user_id: userId, target_type: targetType, target_id: targetId })
  if (error) throw error
}

export async function fetchComments(
  targetType: FeedTargetType,
  targetId: string,
): Promise<FeedCommentWithAuthor[]> {
  const { data: comments, error } = await supabase
    .from('feed_comments')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: true })
  if (error) throw error
  if (comments.length === 0) return []

  const userIds = [...new Set(comments.map((c) => c.user_id))]
  const { data: profiles, error: profilesError } = await supabase
    .from('public_profiles')
    .select('id, display_name')
    .in('id', userIds)
  if (profilesError) throw profilesError
  const displayNameByUserId = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name ?? 'Utilisateur']),
  )

  return comments.map((comment) => ({
    ...comment,
    displayName: displayNameByUserId.get(comment.user_id) ?? 'Utilisateur',
  }))
}

export async function addComment(
  targetType: FeedTargetType,
  targetId: string,
  content: string,
): Promise<void> {
  const userId = await requireUserId()
  const { error } = await supabase
    .from('feed_comments')
    .insert({ user_id: userId, target_type: targetType, target_id: targetId, content })
  if (error) throw error
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('feed_comments').delete().eq('id', id)
  if (error) throw error
}
