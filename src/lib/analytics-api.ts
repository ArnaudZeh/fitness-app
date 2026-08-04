import { supabase } from '@/lib/supabase'
import { toLocalDateString } from '@/lib/dates'

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export interface SetHistoryRecord {
  id: string
  exerciseId: string
  exerciseName: string
  muscleGroup: string | null
  imageUrl: string | null
  weightKg: number
  reps: number
  rpe: number | null
  loggedAt: string
}

interface SetHistoryRow {
  id: string
  actual_weight_kg: number
  actual_reps: number
  actual_rpe: number | null
  session_template_exercise: {
    exercise: { id: string; name: string; muscle_group: string | null; image_url: string | null } | null
  } | null
  session_log: { started_at: string } | null
}

// Every logged set, across every program, enriched with the exercise it
// belongs to and the date it was logged — the raw material for all the
// analytics views (1RM progression, tonnage, the activity heatmap).
// Analytics is a reporting/reflection feature, not something used mid-set,
// so unlike SessionLogPage this stays online-only (same bucket as
// Programs/Profile) rather than routing through the Dexie offline layer.
export async function fetchSetHistory(): Promise<SetHistoryRecord[]> {
  const userId = await requireUserId()
  // Explicit filter, not just RLS: session_log_sets' RLS is currently
  // strict self-only (no friend carve-out, unlike programs/weight_entries),
  // but training history is exactly the kind of data a future "compare
  // with a friend" feature would want to widen visibility on. Filtering
  // here up front means that widening can never silently leak into this
  // "my history" read.
  const { data, error } = await supabase
    .from('session_log_sets')
    .select(
      `
      id,
      actual_weight_kg,
      actual_reps,
      actual_rpe,
      session_template_exercise:session_template_exercises (
        exercise:exercises ( id, name, muscle_group, image_url )
      ),
      session_log:session_logs ( started_at )
    `,
    )
    .eq('user_id', userId)
  if (error) throw error

  const rows = data as unknown as SetHistoryRow[]
  const records: SetHistoryRecord[] = []
  for (const row of rows) {
    const exercise = row.session_template_exercise?.exercise
    const startedAt = row.session_log?.started_at
    if (!exercise || !startedAt) continue
    records.push({
      id: row.id,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscle_group,
      imageUrl: exercise.image_url,
      weightKg: row.actual_weight_kg,
      reps: row.actual_reps,
      rpe: row.actual_rpe,
      loggedAt: toLocalDateString(startedAt),
    })
  }
  return records
}
