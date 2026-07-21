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
