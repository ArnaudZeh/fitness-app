import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type ProgramStatus = 'draft' | 'active' | 'archived'
export type ProgramFocus = 'force' | 'hypertrophie' | 'endurance' | 'deload'

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
  deload: 'Deload',
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
  const userId = await requireUserId()
  // Explicit filter, not just RLS: since the friend-profile feature widened
  // the SELECT policy to also allow reading a friend's active program,
  // relying on RLS alone here would leak a friend's program into "my
  // programs" (it would even win the most-recent-active sort on the
  // dashboard). fetchFriendProfile() is the intended path for that data.
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('user_id', userId)
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

// Only reduces genuinely loaded weight — a bodyweight exercise's negative
// target_weight_kg is assistance (more negative = easier), not a load to
// cut, so scaling its magnitude down would make the exercise HARDER, the
// opposite of what a deload wants. Left untouched, along with null (no
// reference weight set). Rounds to 1 decimal, matching the column's
// numeric(5,1) precision.
export function applyLoadReduction(
  targetWeightKg: number | null,
  reductionPercent: number,
): number | null {
  if (targetWeightKg === null || targetWeightKg <= 0 || reductionPercent === 0) {
    return targetWeightKg
  }
  const reduced = targetWeightKg * (1 - reductionPercent / 100)
  return Math.round(reduced * 10) / 10
}

export interface CopyProgramOptions {
  focus?: ProgramFocus
  // Percentage cut applied to every exercise's target_weight_kg — see
  // applyLoadReduction. 0 (default) copies weights unchanged.
  loadReductionPercent?: number
}

// Shared by duplicateProgram() (same owner) and copyProgramToMyAccount()
// (source owned by someone else, entirely) — the source's session_templates/
// session_template_exercises reads below carry no owner filter, relying on
// RLS alone to decide what's readable, so this works unchanged for a
// friend's or public user's active program once RLS allows the read.
async function copyProgramInternal(
  program: Program,
  newName: string,
  options: CopyProgramOptions = {},
): Promise<Program> {
  const userId = await requireUserId()
  const focus = options.focus ?? program.focus
  const loadReductionPercent = options.loadReductionPercent ?? 0
  const { data: newProgram, error: programError } = await supabase
    .from('programs')
    .insert({
      user_id: userId,
      name: newName,
      description: program.description,
      focus,
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
      .is('archived_at', null)
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
            target_weight_kg: applyLoadReduction(slot.target_weight_kg, loadReductionPercent),
            notes: slot.notes,
            superset_group: slot.superset_group,
            is_unilateral: slot.is_unilateral,
            is_bodyweight: slot.is_bodyweight,
          })),
        )
      if (newSlotsError) throw newSlotsError
    }
  }

  return createdProgram
}

export async function duplicateProgram(
  program: Program,
  newName: string,
  options: CopyProgramOptions = {},
): Promise<Program> {
  return copyProgramInternal(program, newName, options)
}

// Copies someone else's active program (friend or public profile — RLS on
// programs/session_templates/session_template_exercises decides which,
// this function doesn't need to know) into the caller's own account as a
// fully independent copy, same one-shot semantics as duplicateProgram().
export async function copyProgramToMyAccount(
  programId: string,
  sourceLabel: string,
): Promise<Program> {
  const source = await fetchProgram(programId)
  return copyProgramInternal(source, `${source.name} (${sourceLabel})`)
}
