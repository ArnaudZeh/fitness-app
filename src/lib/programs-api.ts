import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { DEFAULT_REST_SECONDS_BY_FOCUS } from '@/lib/sessions-api'

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

// Signed percent: positive reduces the weight, negative increases it (used
// for e.g. hypertrophie -> force, where the working load should go up).
// Only ever touches genuinely loaded weight — a bodyweight exercise's
// negative target_weight_kg is assistance (more negative = easier), not a
// load to scale, so changing its magnitude either way would move the
// exercise's real difficulty in the wrong direction. Left untouched, along
// with null (no reference weight set). Rounds to 1 decimal, matching the
// column's numeric(5,1) precision.
export function applyLoadAdjustment(
  targetWeightKg: number | null,
  adjustmentPercent: number,
): number | null {
  if (targetWeightKg === null || targetWeightKg <= 0 || adjustmentPercent === 0) {
    return targetWeightKg
  }
  const adjusted = targetWeightKg * (1 - adjustmentPercent / 100)
  return Math.round(adjusted * 10) / 10
}

// Same signed percentage as applyLoadAdjustment (positive reduces, negative
// increases), applied to target_rpe instead of target_weight_kg — a
// duplicated cycle's effort level should scale down/up with its load the
// same way, so this deliberately reuses the single adjustment percent the
// user already picks in the dialog rather than adding a second knob.
// Clamped to the RPE scale's real bounds (0-10, matching the column's own
// CHECK constraint) since unlike weight, RPE has a hard ceiling — a large
// negative (load-increasing) adjustment on an already-high source RPE must
// not produce a nonsensical >10 value. A null source RPE (never set) stays
// null — nothing to scale, and inventing one would misrepresent the
// original program's intent.
export function applyRpeAdjustment(
  targetRpe: number | null,
  adjustmentPercent: number,
): number | null {
  if (targetRpe === null || adjustmentPercent === 0) return targetRpe
  const adjusted = targetRpe * (1 - adjustmentPercent / 100)
  return Math.round(Math.min(10, Math.max(0, adjusted)) * 10) / 10
}

// Point-based RPE nudge for a real focus-to-focus transition (force/
// hypertrophie/endurance between each other) — decoupled from
// applyRpeAdjustment's percentage, at the user's explicit request: their
// own calibration ("mes RPE enregistrés sont un peu surestimés"), not a
// universal correction. Deload keeps applyRpeAdjustment (percentage tied
// to its own load cut) — its RPE target is already tuned separately and a
// flat point offset would badly undershoot the intended effort drop.
export function applyRpeOffset(targetRpe: number | null, offsetPoints: number): number | null {
  if (targetRpe === null || offsetPoints === 0) return targetRpe
  return Math.round(Math.min(10, Math.max(0, targetRpe + offsetPoints)) * 10) / 10
}

// Charge et reps cibles par focus de DESTINATION — une propriété fixe de
// la zone d'entraînement visée, pas un ratio dérivé de la source (Force
// vise toujours la charge maximale disponible peu importe d'où on vient,
// Hypertrophie/Endurance visent toujours la même fourchette). Chiffres
// donnés directement par le user pour son usage réel de périodisation,
// pas dérivés d'une formule théorique de %1RM (l'ancienne
// FOCUS_REFERENCE_1RM_PERCENT/le ratio source→dest ont été remplacés par
// ces valeurs explicites). Reps différenciées par type d'exercice
// (exercises.is_compound) — un exercice d'isolation vise plus de
// répétitions à charge égale de fourchette. Deload n'a d'entrée dans
// aucune des deux tables : il garde le schéma de reps du programme
// dupliqué tel quel et son propre mécanisme de charge dédié
// (DELOAD_REDUCTION_OPTIONS) — une décharge n'est pas une nouvelle zone
// d'entraînement, juste une réduction temporaire du bloc en cours.
export const FOCUS_LOAD_REDUCTION_RANGE: Record<
  Exclude<ProgramFocus, 'deload'>,
  { min: number; max: number; default: number }
> = {
  force: { min: 0, max: 0, default: 0 },
  hypertrophie: { min: 15, max: 25, default: 20 },
  endurance: { min: 30, max: 45, default: 38 },
}

export const FOCUS_REP_RANGE: Record<
  Exclude<ProgramFocus, 'deload'>,
  Record<'compound' | 'isolation', { min: number; max: number }>
> = {
  force: { compound: { min: 3, max: 6 }, isolation: { min: 6, max: 10 } },
  hypertrophie: { compound: { min: 8, max: 12 }, isolation: { min: 10, max: 15 } },
  endurance: { compound: { min: 12, max: 20 }, isolation: { min: 15, max: 20 } },
}

// Preset choices for a deload duplication's load cut — a 30-50% reduction
// off the duplicated session's reference weights is the moderate-to-
// pronounced range commonly used for a deload week in periodization
// literature (NSCA; Helms/Israetel consensus), deliberately deeper than a
// merely "moderate" cut since the point of a deload is genuine recovery.
export const DELOAD_REDUCTION_OPTIONS = [30, 35, 40, 45, 50] as const
export const DEFAULT_DELOAD_REDUCTION_PERCENT = 40

// -1 as long as a real (non-deload) focus change happens, 0 otherwise —
// see applyRpeOffset.
export const DEFAULT_RPE_ADJUSTMENT_POINTS = -1

export function suggestRpeAdjustmentPoints(
  sourceFocus: ProgramFocus,
  destFocus: ProgramFocus,
): number {
  if (sourceFocus === destFocus) return 0
  if (sourceFocus === 'deload' || destFocus === 'deload') return 0
  return DEFAULT_RPE_ADJUSTMENT_POINTS
}

// Returns 0 when the focus doesn't actually change, or when either side is
// 'deload' (deload duplications use DELOAD_REDUCTION_OPTIONS instead) —
// otherwise the destination focus's own fixed default, see
// FOCUS_LOAD_REDUCTION_RANGE.
export function suggestFocusLoadAdjustmentPercent(
  sourceFocus: ProgramFocus,
  destFocus: ProgramFocus,
): number {
  if (sourceFocus === destFocus) return 0
  if (sourceFocus === 'deload' || destFocus === 'deload') return 0
  return FOCUS_LOAD_REDUCTION_RANGE[destFocus].default
}

export interface CopyProgramOptions {
  focus?: ProgramFocus
  // Percentage adjustment applied to every exercise's target_weight_kg,
  // and (deload only) target_rpe — see applyLoadAdjustment/
  // applyRpeAdjustment. 0 (default) copies both unchanged.
  loadAdjustmentPercent?: number
  // Point-based RPE nudge for a real (non-deload) focus change — see
  // applyRpeOffset. Ignored when either focus is 'deload', which keeps
  // using loadAdjustmentPercent via applyRpeAdjustment instead.
  rpeAdjustmentPoints?: number
  // Recent average actual weight per exercise (see
  // computeRecentAverageWeightByExercise in analytics.ts), used to fill in
  // target_weight_kg for a slot that doesn't already have one set. Real
  // performance lives in logged sets, not in this optional planning field —
  // most slots never have it set, so without this a duplicated program's
  // weights stay blank even though real recent numbers exist. Only ever
  // used as a fallback: an explicit target_weight_kg on the source slot
  // always wins. Omitted/empty for copyProgramToMyAccount, which has no way
  // to know the calling user's own history for a stranger's exercises.
  recentAverageWeightByExercise?: Map<string, number>
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
  const loadAdjustmentPercent = options.loadAdjustmentPercent ?? 0
  const rpeAdjustmentPoints = options.rpeAdjustmentPoints ?? 0
  const recentAverageWeightByExercise =
    options.recentAverageWeightByExercise ?? new Map<string, number>()
  // A real training-zone change (force/hypertrophie/endurance between each
  // other) resets reps and switches the RPE mechanism to a flat point
  // offset — a deload-involving transition on either end keeps today's
  // behavior untouched (verbatim reps, percentage-linked RPE via
  // applyRpeAdjustment), since a deload isn't a new training zone, just a
  // temporary reduction of whichever block it's duplicated from.
  const isRealFocusChange =
    focus !== program.focus && focus !== 'deload' && program.focus !== 'deload'
  let compoundByExerciseId = new Map<string, boolean>()
  if (isRealFocusChange) {
    const { data: exerciseRows, error: exercisesError } = await supabase
      .from('exercises')
      .select('id, is_compound')
    if (exercisesError) throw exercisesError
    compoundByExerciseId = new Map(exerciseRows.map((row) => [row.id, row.is_compound]))
  }
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
          slots.map((slot) => {
            const fallbackWeightKg: number | null =
              recentAverageWeightByExercise.get(slot.exercise_id) ?? null
            // Reps are a property of the destination training zone, not a
            // value scaled from the source (same reasoning as rest time
            // below) — isolation exercises target a higher rep band than
            // compound ones within the same focus. Falls back to compound
            // when an exercise's classification is missing (safer default
            // than isolation, see the migration's own comment).
            const repRange = isRealFocusChange
              ? FOCUS_REP_RANGE[focus][
                  (compoundByExerciseId.get(slot.exercise_id) ?? true) ? 'compound' : 'isolation'
                ]
              : null
            return {
              user_id: userId,
              session_template_id: newTemplate.id,
              exercise_id: slot.exercise_id,
              order_index: slot.order_index,
              target_sets: slot.target_sets,
              target_reps_min: repRange ? repRange.min : slot.target_reps_min,
              target_reps_max: repRange ? repRange.max : slot.target_reps_max,
              target_rpe: isRealFocusChange
                ? applyRpeOffset(slot.target_rpe, rpeAdjustmentPoints)
                : applyRpeAdjustment(slot.target_rpe, loadAdjustmentPercent),
              // Frozen from the *destination* focus's own scientific default
              // (DEFAULT_REST_SECONDS_BY_FOCUS, sessions-api.ts) rather than
              // carried from the source slot. Rest isn't a percentage of the
              // source value like weight/RPE — it's a property of the
              // training type itself (ATP-PCr recovery needs for force vs.
              // metabolic-stress targets for endurance, etc.), so the same
              // focus-driven default already used by AI program generation/
              // adaptation applies here too. This also fixes a real bug: a
              // source slot with no explicit rest used to resolve (at
              // display time) against the *source* focus's default, then
              // silently resolve against a different number once copied
              // under a new focus — e.g. a force program's unset rest
              // (falls back to 180s) duplicated to deload used to display
              // 60s with nothing ever actually written to the column.
              target_rest_seconds: DEFAULT_REST_SECONDS_BY_FOCUS[focus],
              target_weight_kg: applyLoadAdjustment(
                slot.target_weight_kg ?? fallbackWeightKg,
                loadAdjustmentPercent,
              ),
              notes: slot.notes,
              superset_group: slot.superset_group,
              is_unilateral: slot.is_unilateral,
              is_bodyweight: slot.is_bodyweight,
            }
          }),
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
