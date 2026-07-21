import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { nextOrderIndex } from '@/lib/ordering'

export type SessionTemplate = Database['public']['Tables']['session_templates']['Row']
export type SessionRow = Database['public']['Tables']['sessions']['Row']

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

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchSessionTemplates(blockId: string): Promise<SessionTemplate[]> {
  const { data, error } = await supabase
    .from('session_templates')
    .select('*')
    .eq('block_id', blockId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data
}

export async function createSessionTemplate(
  blockId: string,
  name: string,
): Promise<SessionTemplate> {
  const userId = await requireUserId()
  const existing = await fetchSessionTemplates(blockId)

  const { data, error } = await supabase
    .from('session_templates')
    .insert({
      block_id: blockId,
      user_id: userId,
      name,
      order_index: nextOrderIndex(existing),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSessionTemplate(
  id: string,
  name: string,
): Promise<SessionTemplate> {
  const { data, error } = await supabase
    .from('session_templates')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSessionTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('session_templates').delete().eq('id', id)
  if (error) throw error
}

export async function swapSessionTemplateOrder(
  a: SessionTemplate,
  b: SessionTemplate,
): Promise<void> {
  const { error: errorA } = await supabase
    .from('session_templates')
    .update({ order_index: b.order_index })
    .eq('id', a.id)
  if (errorA) throw errorA

  const { error: errorB } = await supabase
    .from('session_templates')
    .update({ order_index: a.order_index })
    .eq('id', b.id)
  if (errorB) throw errorB
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

export async function fetchSessions(blockId: string): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('block_id', blockId)
    .order('week_number', { ascending: true })
  if (error) throw error
  return data
}

export async function generateBlockSessions(blockId: string): Promise<number> {
  const { data, error } = await supabase.rpc('generate_block_sessions', {
    p_block_id: blockId,
  })
  if (error) throw error
  return data
}
