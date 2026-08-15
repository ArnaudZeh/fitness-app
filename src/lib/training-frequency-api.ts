import { supabase } from '@/lib/supabase'

const WINDOW_DAYS = 14

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// Trailing 14-day window of completed sessions, averaged to a per-week
// figure — feeds the nutrition activity model's training bump (see
// nutrition-calc.ts) so it reflects actual recent training rather than a
// self-declared frequency that goes stale the moment a routine changes.
export async function fetchAverageSessionsPerWeek(): Promise<number> {
  const userId = await requireUserId()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - WINDOW_DAYS)
  const { count, error } = await supabase
    .from('session_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('started_at', cutoff.toISOString())
  if (error) throw error
  return ((count ?? 0) / WINDOW_DAYS) * 7
}
