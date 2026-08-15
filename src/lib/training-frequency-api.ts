import { supabase } from '@/lib/supabase'
import type { CompletedSessionWindow } from '@/lib/nutrition-calc'

export const TRAINING_WINDOW_DAYS = 14

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// Trailing 14-day window of completed sessions (start/end times) — feeds
// the nutrition activity model's training bump (see
// computeAverageWeeklyTrainingMinutes in nutrition-calc.ts) so it reflects
// actual recent training rather than a self-declared frequency that goes
// stale the moment a routine changes.
export async function fetchRecentCompletedSessions(): Promise<CompletedSessionWindow[]> {
  const userId = await requireUserId()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - TRAINING_WINDOW_DAYS)
  const { data, error } = await supabase
    .from('session_logs')
    .select('started_at, completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('started_at', cutoff.toISOString())
  if (error) throw error
  return data.map((row) => ({ startedAt: row.started_at, completedAt: row.completed_at }))
}
