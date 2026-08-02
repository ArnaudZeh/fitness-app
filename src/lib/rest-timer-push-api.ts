import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'

// Reads the in-memory auth store rather than supabase.auth.getUser() (a
// network round-trip) — a rest timer starts constantly during a session and
// this must stay cheap and silent, including when offline.
function currentUserId(): string | null {
  return useAuthStore.getState().session?.user.id ?? null
}

// Best-effort background scheduling: a failure here (offline, RLS edge
// case) should never interrupt the rest timer itself, so errors are logged
// and swallowed rather than thrown.
export async function scheduleRestTimerPush(
  sessionLogSetId: string,
  fireAt: Date,
): Promise<void> {
  const userId = currentUserId()
  if (!userId) return

  const { error } = await supabase.from('rest_timer_notifications').upsert(
    {
      user_id: userId,
      session_log_set_id: sessionLogSetId,
      fire_at: fireAt.toISOString(),
      sent: false,
    },
    { onConflict: 'session_log_set_id' },
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
