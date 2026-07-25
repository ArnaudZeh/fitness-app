import { supabase } from '@/lib/supabase'
import type { MentionCandidate } from '@/lib/mentions'

export type MentionContentType = 'post' | 'comment'

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// Best-effort — called right after a post/comment is successfully created,
// so a failure here shouldn't roll back or error out the publish itself.
export async function createMentionNotifications(
  contentType: MentionContentType,
  contentId: string,
  mentionedUserIds: string[],
): Promise<void> {
  if (mentionedUserIds.length === 0) return
  const authorId = await requireUserId()
  const rows = mentionedUserIds
    .filter((id) => id !== authorId)
    .map((mentionedUserId) => ({
      content_type: contentType,
      content_id: contentId,
      author_id: authorId,
      mentioned_user_id: mentionedUserId,
    }))
  if (rows.length === 0) return
  const { error } = await supabase.from('feed_mentions').insert(rows)
  if (error) throw error
}

export async function fetchUnreadMentionsCount(): Promise<number> {
  const userId = await requireUserId()
  const { count, error } = await supabase
    .from('feed_mentions')
    .select('id', { count: 'exact', head: true })
    .eq('mentioned_user_id', userId)
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

export async function markMentionsRead(): Promise<void> {
  const userId = await requireUserId()
  const { error } = await supabase
    .from('feed_mentions')
    .update({ read_at: new Date().toISOString() })
    .eq('mentioned_user_id', userId)
    .is('read_at', null)
  if (error) throw error
}

// Fetches who was actually tagged in each piece of content (by id), so
// rendering can highlight "@Nom" precisely instead of guessing from the
// viewer's own friends list (which may not include everyone the author is
// friends with).
export async function fetchMentionsByContentId(
  contentType: MentionContentType,
  contentIds: string[],
): Promise<Map<string, MentionCandidate[]>> {
  const byContentId = new Map<string, MentionCandidate[]>()
  if (contentIds.length === 0) return byContentId

  const { data: mentions, error } = await supabase
    .from('feed_mentions')
    .select('content_id, mentioned_user_id')
    .eq('content_type', contentType)
    .in('content_id', contentIds)
  if (error) throw error
  if (!mentions || mentions.length === 0) return byContentId

  const userIds = [...new Set(mentions.map((m) => m.mentioned_user_id))]
  const { data: profiles, error: profilesError } = await supabase
    .from('public_profiles')
    .select('id, display_name')
    .in('id', userIds)
  if (profilesError) throw profilesError
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? 'Utilisateur']))

  for (const mention of mentions) {
    const candidate: MentionCandidate = {
      userId: mention.mentioned_user_id,
      displayName: nameById.get(mention.mentioned_user_id) ?? 'Utilisateur',
    }
    const existing = byContentId.get(mention.content_id)
    if (existing) existing.push(candidate)
    else byContentId.set(mention.content_id, [candidate])
  }
  return byContentId
}
