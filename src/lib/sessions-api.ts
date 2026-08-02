import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { nextOrderIndex } from '@/lib/ordering'
import type { ProgramFocus } from '@/lib/programs-api'

export type DayType = 'training' | 'rest'

type SessionTemplateRow = Database['public']['Tables']['session_templates']['Row']

export interface SessionTemplate extends Omit<SessionTemplateRow, 'day_type'> {
  day_type: DayType
}

type SessionTemplateExerciseRow =
  Database['public']['Tables']['session_template_exercises']['Row']

export interface SessionTemplateExercise extends SessionTemplateExerciseRow {
  exercise: { id: string; name: string; muscle_group: string | null; image_url: string | null }
}

export interface SessionTemplateExerciseInput {
  exercise_id: string
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  target_rpe: number | null
  target_rest_seconds: number | null
  target_weight_kg: number | null
  notes: string | null
  superset_group: string | null
  is_unilateral: boolean
}

// Rest interval defaults by training focus, since the same duration doesn't
// serve every goal:
// - Force (near-maximal loads, ~1-5RM): longer rest for fuller ATP-PCr
//   recovery between sets — NSCA guidance and de Salles et al. (2009,
//   Sports Medicine) recommend ~3-5 min for strength/power work.
// - Hypertrophie: Schoenfeld, Pope et al. (2016, J Strength Cond Res) found
//   3-min rest produced equal-or-greater strength AND hypertrophy than 1-min
//   rest, likely via better maintenance of load/volume across sets — the
//   traditional "60s for the pump" is no longer well supported. ~90s is a
//   reasonable middle ground for typical working sets.
// - Endurance (higher reps, metabolic/muscular-endurance focus): shorter
//   rest keeps metabolic stress elevated, consistent with the classic
//   NSCA muscular-endurance guidance of well under a minute.
export const DEFAULT_REST_SECONDS_BY_FOCUS: Record<ProgramFocus, number> = {
  force: 180,
  hypertrophie: 90,
  endurance: 45,
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

export const WEEKDAY_SHORT_LABELS: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
  7: 'Dim',
}

// JS's Date.getDay() is 0=Sunday..6=Saturday — remapped to this app's
// 1=Monday..7=Sunday convention (matching WEEKDAY_LABELS and day_of_week
// columns) everywhere a "what day is it" question comes up.
export function getTodayIsoDayOfWeek(now: Date = new Date()): number {
  const day = now.getDay()
  return day === 0 ? 7 : day
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
    .select('*, exercise:exercises(id, name, muscle_group, image_url)')
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
    .select('*, exercise:exercises(id, name, muscle_group, image_url)')
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
    .select('*, exercise:exercises(id, name, muscle_group, image_url)')
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

// Called after a drag-and-drop reorder with the *entire* new order (small
// lists — a training day rarely has more than a handful of exercises — so a
// full renumbering upsert is simpler and safer than diffing which rows
// actually moved). `slots` already carries the moved item's updated
// superset_group (see inferGroupAfterMove in ordering.ts), so this single
// call persists both the new order and any group-membership change together.
export async function reorderSessionTemplateExercises(
  slots: SessionTemplateExercise[],
): Promise<void> {
  const rows = slots.map((slot, index) => ({
    id: slot.id,
    user_id: slot.user_id,
    session_template_id: slot.session_template_id,
    exercise_id: slot.exercise_id,
    order_index: index,
    target_sets: slot.target_sets,
    target_reps_min: slot.target_reps_min,
    target_reps_max: slot.target_reps_max,
    target_rpe: slot.target_rpe,
    target_rest_seconds: slot.target_rest_seconds,
    target_weight_kg: slot.target_weight_kg,
    notes: slot.notes,
    superset_group: slot.superset_group,
    is_unilateral: slot.is_unilateral,
  }))
  const { error } = await supabase.from('session_template_exercises').upsert(rows)
  if (error) throw error
}

// Replaces the target day's exercises with a copy of the source day's —
// used for "duplicate this day onto another" (e.g. copy Monday onto
// Friday). Mirrors the per-day copy loop in programs-api.ts's
// copyProgramInternal, minus the "create a new program" part: the 7
// session_templates already exist for every program (on_program_created
// trigger), so this only ever touches session_template_exercises + the
// target's day_type.
export async function duplicateSessionTemplateExercises(
  sourceTemplateId: string,
  targetTemplateId: string,
): Promise<void> {
  const userId = await requireUserId()
  const sourceSlots = await fetchSessionTemplateExercises(sourceTemplateId)

  const { error: deleteError } = await supabase
    .from('session_template_exercises')
    .delete()
    .eq('session_template_id', targetTemplateId)
  if (deleteError) throw deleteError

  const { error: dayTypeError } = await supabase
    .from('session_templates')
    .update({ day_type: 'training' })
    .eq('id', targetTemplateId)
  if (dayTypeError) throw dayTypeError

  if (sourceSlots.length === 0) return

  const { error: insertError } = await supabase.from('session_template_exercises').insert(
    sourceSlots.map((slot) => ({
      user_id: userId,
      session_template_id: targetTemplateId,
      exercise_id: slot.exercise_id,
      order_index: slot.order_index,
      target_sets: slot.target_sets,
      target_reps_min: slot.target_reps_min,
      target_reps_max: slot.target_reps_max,
      target_rpe: slot.target_rpe,
      target_rest_seconds: slot.target_rest_seconds,
      target_weight_kg: slot.target_weight_kg,
      notes: slot.notes,
      superset_group: slot.superset_group,
      is_unilateral: slot.is_unilateral,
    })),
  )
  if (insertError) throw insertError
}

// Swaps just the exercise on a slot (and clears its load target, which
// won't transfer to a different exercise/machine) without touching any
// other field — used when a mid-session substitution (SessionLogPage) is
// also applied to the program for future weeks. A partial update rather
// than routing through updateSessionTemplateExercise's full-row rewrite:
// that needs a complete SessionTemplateExerciseInput including `notes`,
// which isn't part of the offline session-plan cache this call is driven
// from, and reconstructing it from stale/incomplete data risked silently
// wiping any notes already on the slot.
export async function substituteSessionTemplateExercise(
  id: string,
  exerciseId: string,
): Promise<void> {
  const { error } = await supabase
    .from('session_template_exercises')
    .update({ exercise_id: exerciseId, target_weight_kg: null })
    .eq('id', id)
  if (error) throw error
}

// Bulk-sets the same rest time across every exercise in a superset group —
// the "repos unique pour le groupe" convenience. Just a batch write to the
// same target_rest_seconds column each exercise already has individually
// ("repos par exercice" is simply never using this and editing each slot on
// its own, as today) — no separate group-level column or live-session
// behavior change.
export async function setGroupRestSeconds(
  slotIds: string[],
  restSeconds: number | null,
): Promise<void> {
  const { error } = await supabase
    .from('session_template_exercises')
    .update({ target_rest_seconds: restSeconds })
    .in('id', slotIds)
  if (error) throw error
}
