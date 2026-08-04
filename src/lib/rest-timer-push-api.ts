import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'

// Reads the in-memory auth store rather than supabase.auth.getUser() (a
// network round-trip) — a rest timer starts constantly during a session and
// this must stay cheap and silent, including when offline.
function currentUserId(): string | null {
  return useAuthStore.getState().session?.user.id ?? null
}

type RestTimerStage = 'halfway' | 'ending' | 'done'

// A true live-updating countdown isn't achievable on a lock screen from a
// PWA (no Live Activities on iOS, no chronometer-style notification on
// Android via the standard Web Notifications API) — these checkpoints are
// the closest approximation: a couple of silent progress pings plus the
// existing "done" alert, instead of a single notification at the very end.
export async function scheduleRestTimerPush(
  sessionLogSetId: string,
  endAt: Date,
  remainingSeconds: number,
): Promise<void> {
  const userId = currentUserId()
  if (!userId) return

  const checkpoints: { stage: RestTimerStage; fire_at: string }[] = [
    { stage: 'done', fire_at: endAt.toISOString() },
  ]
  // Skip checkpoints that would land within a second or two of "done" (or
  // of each other) on a short rest — not worth a separate ping.
  if (remainingSeconds >= 20) {
    checkpoints.push({
      stage: 'ending',
      fire_at: new Date(endAt.getTime() - 10_000).toISOString(),
    })
  }
  if (remainingSeconds >= 40) {
    checkpoints.push({
      stage: 'halfway',
      fire_at: new Date(endAt.getTime() - remainingSeconds * 500).toISOString(),
    })
  }

  // Delete-then-insert rather than upsert: adjusting the timer down (e.g.
  // "-15s") can drop a checkpoint below its threshold above, and upsert
  // would leave that now-irrelevant row behind since it's simply absent
  // from the new payload rather than explicitly removed.
  await supabase
    .from('rest_timer_notifications')
    .delete()
    .eq('session_log_set_id', sessionLogSetId)
  const { error } = await supabase.from('rest_timer_notifications').insert(
    checkpoints.map((checkpoint) => ({
      user_id: userId,
      session_log_set_id: sessionLogSetId,
      ...checkpoint,
      sent: false,
    })),
  )
  if (error) console.error('Failed to schedule rest timer push', error)
}

export async function cancelRestTimerPush(sessionLogSetId: string): Promise<void> {
  const { error } = await supabase
    .from('rest_timer_notifications')
    .delete()
    .eq('session_log_set_id', sessionLogSetId)
  if (error) console.error('Failed to cancel rest timer push', error)
}
