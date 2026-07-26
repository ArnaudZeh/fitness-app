import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type Exercise = Database['public']['Tables']['exercises']['Row']

export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from('exercises').select('*').order('name')
  if (error) throw error
  return data
}

export async function createExercise(input: {
  name: string
  muscle_group: string | null
}): Promise<Exercise> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('exercises')
    .insert({ ...input, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

// How many of this user's program slots (across every program, not just the
// current one) use each exercise — the proxy for "what do I actually train"
// that powers the picker's "Fréquemment utilisés" shortcut, so the exercise
// you reach for every week doesn't need a fresh search each time.
export async function fetchExerciseUsageCounts(): Promise<Map<string, number>> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('session_template_exercises')
    .select('exercise_id')
    .eq('user_id', user.id)
  if (error) throw error

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    counts.set(row.exercise_id, (counts.get(row.exercise_id) ?? 0) + 1)
  }
  return counts
}
