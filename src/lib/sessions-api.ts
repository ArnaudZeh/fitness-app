import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { nextOrderIndex } from '@/lib/ordering'

export type DayType = 'training' | 'rest'

type SessionTemplateRow = Database['public']['Tables']['session_templates']['Row']

export interface SessionTemplate extends Omit<SessionTemplateRow, 'day_type'> {
  day_type: DayType
}

type SessionTemplateExerciseRow =
  Database['public']['Tables']['session_template_exercises']['Row']

export interface SessionTemplateExercise extends SessionTemplateExerciseRow {
  exercise: { id: string; name: string; muscle_group: string | null }
}

export interface SessionTemplateExerciseInput {
  exercise_id: string
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  target_rpe: number | null
  notes: string | null
}

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  training: 'Entraînement',
  rest: 'Repos',
}

export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
}

function toSessionTemplate(row: SessionTemplateRow): SessionTemplate {
  return { ...row, day_type: row.day_type as DayType }
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// Every program always has exactly 7 rows (one per ISO weekday, 1=Monday),
// auto-created by the on_program_created Postgres trigger.
export async function fetchSessionTemplates(
  programId: string,
): Promise<SessionTemplate[]> {
  const { data, error } = await supabase
    .from('session_templates')
    .select('*')
    .eq('program_id', programId)
    .order('day_of_week', { ascending: true })
  if (error) throw error
  return data.map(toSessionTemplate)
}

export async function fetchSessionTemplate(id: string): Promise<SessionTemplate> {
  const { data, error } = await supabase
    .from('session_templates')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return toSessionTemplate(data)
}

export async function updateSessionTemplateDayType(
  id: string,
  dayType: DayType,
): Promise<SessionTemplate> {
  const { data, error } = await supabase
    .from('session_templates')
    .update({ day_type: dayType })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toSessionTemplate(data)
}

export async function fetchSessionTemplateExercises(
  sessionTemplateId: string,
): Promise<SessionTemplateExercise[]> {
  const { data, error } = await supabase
    .from('session_template_exercises')
    .select('*, exercise:exercises(id, name, muscle_group)')
    .eq('session_template_id', sessionTemplateId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data
}

export async function createSessionTemplateExercise(
  sessionTemplateId: string,
  input: SessionTemplateExerciseInput,
): Promise<SessionTemplateExercise> {
  const userId = await requireUserId()
  const existing = await fetchSessionTemplateExercises(sessionTemplateId)

  const { data, error } = await supabase
    .from('session_template_exercises')
    .insert({
      ...input,
      session_template_id: sessionTemplateId,
      user_id: userId,
      order_index: nextOrderIndex(existing),
    })
    .select('*, exercise:exercises(id, name, muscle_group)')
    .single()
  if (error) throw error
  return data
}

export async function updateSessionTemplateExercise(
  id: string,
  input: SessionTemplateExerciseInput,
): Promise<SessionTemplateExercise> {
  const { data, error } = await supabase
    .from('session_template_exercises')
    .update(input)
    .eq('id', id)
    .select('*, exercise:exercises(id, name, muscle_group)')
    .single()
  if (error) throw error
  return data
}

export async function deleteSessionTemplateExercise(id: string): Promise<void> {
  const { error } = await supabase
    .from('session_template_exercises')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function swapSessionTemplateExerciseOrder(
  a: SessionTemplateExercise,
  b: SessionTemplateExercise,
): Promise<void> {
  const { error: errorA } = await supabase
    .from('session_template_exercises')
    .update({ order_index: b.order_index })
    .eq('id', a.id)
  if (errorA) throw errorA

  const { error: errorB } = await supabase
    .from('session_template_exercises')
    .update({ order_index: a.order_index })
    .eq('id', b.id)
  if (errorB) throw errorB
}
