import { supabase } from '@/lib/supabase'
import { invokeEdgeFunction } from '@/lib/edge-function'
import type { FeedTargetType } from '@/lib/social-display'

export type ActivityType = 'like' | 'comment'

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// Best-effort, called right after a like/comment is successfully created —
// same principle as createMentionNotifications: a failure here shouldn't
// roll back or error out the like/comment itself. Skips notifying yourself
// (liking/commenting on your own content) — the DB constraint would reject
// it anyway, but checking here avoids a pointless round-trip.
export async function notifyActivity(
  type: ActivityType,
  contentType: FeedTargetType,
  contentId: string,
  recipientId: string,
): Promise<void> {
  const actorId = await requireUserId()
  if (recipientId === actorId) return

  // id generated client-side rather than .select()-ed back after insert:
  // the SELECT policy only grants the recipient read access to their own
  // notifications, so the actor can't read the row they just created for
  // someone else — PostgREST's implicit re-select on a chained .select()
  // would fail RLS even though the insert itself is perfectly legitimate.
  const id = crypto.randomUUID()
  const { error } = await supabase.from('feed_activity_notifications').insert({
    id,
    recipient_id: recipientId,
    actor_id: actorId,
    type,
    content_type: contentType,
    content_id: contentId,
  })
  if (error) throw error

  // Push is a nice-to-have on top of the in-app badge (which is already
  // live from the insert above) — the recipient may not even have a push
  // subscription, and that's a normal, silent no-op, not a failure.
  await invokeEdgeFunction('send-social-push', { source: 'activity', id }).catch(() => {})
}

export async function fetchUnreadActivityNotificationsCount(): Promise<number> {
  const userId = await requireUserId()
  const { count, error } = await supabase
    .from('feed_activity_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

export async function markActivityNotificationsRead(): Promise<void> {
  const userId = await requireUserId()
  const { error } = await supabase
    .from('feed_activity_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .is('read_at', null)
  if (error) throw error
}
