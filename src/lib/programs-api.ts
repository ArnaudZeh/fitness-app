import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type ProgramStatus = 'draft' | 'active' | 'archived'
export type ProgramFocus = 'force' | 'hypertrophie' | 'endurance'

type ProgramRow = Database['public']['Tables']['programs']['Row']

// Postgres CHECK constraints guarantee these columns only ever hold the
// literal values below — narrower than the generated `string` column type.
function toProgram(row: ProgramRow): Program {
  return { ...row, status: row.status as ProgramStatus, focus: row.focus as ProgramFocus }
}

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  archived: 'Archivé',
}

export const PROGRAM_FOCUS_LABELS: Record<ProgramFocus, string> = {
  force: 'Force',
  hypertrophie: 'Hypertrophie',
  endurance: 'Endurance',
}

export interface Program extends Omit<ProgramRow, 'status' | 'focus'> {
  status: ProgramStatus
  focus: ProgramFocus
}

export interface ProgramInput {
  name: string
  description: string | null
  focus: ProgramFocus
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchPrograms(): Promise<Program[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toProgram)
}

export async function fetchProgram(id: string): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return toProgram(data)
}

export async function createProgram(input: ProgramInput): Promise<Program> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('programs')
    .insert({ ...input, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return toProgram(data)
}

export async function updateProgram(
  id: string,
  patch: Partial<ProgramInput & { status: ProgramStatus }>,
): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toProgram(data)
}

export async function deleteProgram(id: string): Promise<void> {
  const { error } = await supabase.from('programs').delete().eq('id', id)
  if (error) throw error
}

export async function duplicateProgram(program: Program): Promise<Program> {
  const userId = await requireUserId()
  const { data: newProgram, error: programError } = await supabase
    .from('programs')
    .insert({
      user_id: userId,
      name: `${program.name} (copie)`,
      description: program.description,
      focus: program.focus,
    })
    .select()
    .single()
  if (programError) throw programError
  const createdProgram = toProgram(newProgram)

  // The new program's 7 weekday rows already exist (on_program_created
  // trigger) — match each one to the source program's day by day_of_week
  // and update its day_type + copy its exercises, rather than inserting
  // new rows (blocked by RLS: users can no longer insert session_templates).
  const [
    { data: sourceTemplates, error: sourceError },
    { data: newTemplates, error: newError },
  ] = await Promise.all([
    supabase.from('session_templates').select('*').eq('program_id', program.id),
    supabase.from('session_templates').select('*').eq('program_id', createdProgram.id),
  ])
  if (sourceError) throw sourceError
  if (newError) throw newError

  const newTemplateByDay = new Map(newTemplates.map((t) => [t.day_of_week, t]))

  for (const sourceTemplate of sourceTemplates) {
    if (sourceTemplate.day_type !== 'training') continue
    const newTemplate = newTemplateByDay.get(sourceTemplate.day_of_week)
    if (!newTemplate) continue

    const { error: updateError } = await supabase
      .from('session_templates')
      .update({ day_type: 'training' })
      .eq('id', newTemplate.id)
    if (updateError) throw updateError

    const { data: slots, error: slotsError } = await supabase
      .from('session_template_exercises')
      .select('*')
      .eq('session_template_id', sourceTemplate.id)
      .order('order_index', { ascending: true })
    if (slotsError) throw slotsError

    if (slots.length > 0) {
      const { error: newSlotsError } = await supabase
        .from('session_template_exercises')
        .insert(
          slots.map((slot) => ({
            user_id: userId,
            session_template_id: newTemplate.id,
            exercise_id: slot.exercise_id,
            order_index: slot.order_index,
            target_sets: slot.target_sets,
            target_reps_min: slot.target_reps_min,
            target_reps_max: slot.target_reps_max,
            target_rpe: slot.target_rpe,
            target_rest_seconds: slot.target_rest_seconds,
            notes: slot.notes,
            superset_group: slot.superset_group,
            is_unilateral: slot.is_unilateral,
          })),
        )
      if (newSlotsError) throw newSlotsError
    }
  }

  return createdProgram
}
