import { invokeEdgeFunction } from '@/lib/edge-function'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type ExportedCoachingProfile = Omit<
  Row<'coaching_profile'>,
  'id' | 'created_at' | 'updated_at'
>
export type ExportedWeightEntry = Omit<Row<'weight_entries'>, 'user_id'>
export type ExportedExercise = Pick<
  Row<'exercises'>,
  'id' | 'name' | 'muscle_group' | 'created_at'
>
export type ExportedProgram = Omit<Row<'programs'>, 'user_id'>
export type ExportedSessionTemplate = Omit<Row<'session_templates'>, 'user_id'>
export type ExportedSessionTemplateExercise = Omit<
  Row<'session_template_exercises'>,
  'user_id'
>
export type ExportedSessionLog = Omit<Row<'session_logs'>, 'user_id'>
export type ExportedSessionLogSet = Omit<Row<'session_log_sets'>, 'user_id'>

export interface UserDataExport {
  schema_version: 1
  exported_at: string
  profile: Pick<
    Row<'profiles'>,
    'display_name' | 'date_of_birth' | 'sex' | 'height_cm' | 'goal' | 'target_weight_kg'
  >
  // Optional: absent on export files created before this field existed.
  // Always populated by exportUserData() itself for any current export.
  coaching_profile?: ExportedCoachingProfile
  weight_entries: ExportedWeightEntry[]
  exercises: ExportedExercise[]
  programs: ExportedProgram[]
  session_templates: ExportedSessionTemplate[]
  session_template_exercises: ExportedSessionTemplateExercise[]
  session_logs: ExportedSessionLog[]
  session_log_sets: ExportedSessionLogSet[]
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function stripUserId<T extends { user_id: unknown }>(row: T): Omit<T, 'user_id'> {
  const { user_id: _user_id, ...rest } = row
  return rest
}

function stripCoachingProfileMetadata(row: Row<'coaching_profile'>): ExportedCoachingProfile {
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...rest } = row
  return rest
}

export async function exportUserData(): Promise<UserDataExport> {
  const userId = await requireUserId()

  const profileResult = await supabase
    .from('profiles')
    .select('display_name, date_of_birth, sex, height_cm, goal, target_weight_kg')
    .eq('id', userId)
    .single()
  if (profileResult.error) throw profileResult.error

  const coachingProfileResult = await supabase
    .from('coaching_profile')
    .select('*')
    .eq('id', userId)
    .single()
  if (coachingProfileResult.error) throw coachingProfileResult.error

  const weightEntriesResult = await supabase
    .from('weight_entries')
    .select('*')
    .eq('user_id', userId)
  if (weightEntriesResult.error) throw weightEntriesResult.error

  const exercisesResult = await supabase
    .from('exercises')
    .select('id, name, muscle_group, created_at')
    .eq('user_id', userId)
  if (exercisesResult.error) throw exercisesResult.error

  const programsResult = await supabase.from('programs').select('*').eq('user_id', userId)
  if (programsResult.error) throw programsResult.error

  const sessionTemplatesResult = await supabase
    .from('session_templates')
    .select('*')
    .eq('user_id', userId)
  if (sessionTemplatesResult.error) throw sessionTemplatesResult.error

  const sessionTemplateExercisesResult = await supabase
    .from('session_template_exercises')
    .select('*')
    .eq('user_id', userId)
  if (sessionTemplateExercisesResult.error) throw sessionTemplateExercisesResult.error

  const sessionLogsResult = await supabase
    .from('session_logs')
    .select('*')
    .eq('user_id', userId)
  if (sessionLogsResult.error) throw sessionLogsResult.error

  const sessionLogSetsResult = await supabase
    .from('session_log_sets')
    .select('*')
    .eq('user_id', userId)
  if (sessionLogSetsResult.error) throw sessionLogSetsResult.error

  return {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    profile: profileResult.data,
    coaching_profile: stripCoachingProfileMetadata(coachingProfileResult.data),
    weight_entries: weightEntriesResult.data.map(stripUserId),
    exercises: exercisesResult.data,
    programs: programsResult.data.map(stripUserId),
    session_templates: sessionTemplatesResult.data.map(stripUserId),
    session_template_exercises: sessionTemplateExercisesResult.data.map(stripUserId),
    session_logs: sessionLogsResult.data.map(stripUserId),
    session_log_sets: sessionLogSetsResult.data.map(stripUserId),
  }
}

export function downloadUserDataExport(data: UserDataExport): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `fitness-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const EXPORT_ARRAY_KEYS = [
  'weight_entries',
  'exercises',
  'programs',
  'session_templates',
  'session_template_exercises',
  'session_logs',
  'session_log_sets',
] as const

export function parseUserDataExport(text: string): UserDataExport {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error("Fichier invalide : ce n'est pas un JSON valide.")
  }
  if (typeof json !== 'object' || json === null) {
    throw new Error('Fichier invalide : format non reconnu.')
  }
  const data = json as Record<string, unknown>
  if (data.schema_version !== 1) {
    throw new Error('Fichier invalide : version de schéma non reconnue.')
  }
  if (typeof data.profile !== 'object' || data.profile === null) {
    throw new Error('Fichier invalide : section "profile" manquante.')
  }
  for (const key of EXPORT_ARRAY_KEYS) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Fichier invalide : section "${key}" manquante ou invalide.`)
    }
  }
  return data as unknown as UserDataExport
}

export interface ImportSummary {
  weight_entries: number
  exercises: number
  programs: number
  session_templates: number
  session_template_exercises: number
  session_logs: number
  session_log_sets: number
}

export interface ImportResult {
  imported: ImportSummary
  errors: string[]
}

// Every row is recreated with a fresh id (remapped in-memory as we go) —
// there's no natural key to dedupe programs/sessions on, so re-importing or
// importing into a non-empty account produces visible duplicates rather than
// silent corruption. weight_entries is the one exception: it has a real
// natural key (user_id, recorded_at), so it upserts instead. Dates that are
// meaningful training history (recorded_at, started_at, completed_at) are
// preserved from the export, not stamped with "now" — otherwise every
// imported workout would appear to have happened on the import date, which
// would break Analytics (1RM progression, weekly tonnage, the heatmap) for
// anyone who actually uses this to restore real history. created_at/updated_at
// row metadata is deliberately NOT preserved on structural rows (programs,
// exercises, session_template_exercises, session_log_sets): every list in
// this app sorts by created_at, and a re-imported duplicate carrying the
// exact same timestamp as its original ties the sort order, which makes
// list position flicker non-deterministically between refetches.
export async function importUserData(data: UserDataExport): Promise<ImportResult> {
  const userId = await requireUserId()
  const errors: string[] = []
  const imported: ImportSummary = {
    weight_entries: 0,
    exercises: 0,
    programs: 0,
    session_templates: 0,
    session_template_exercises: 0,
    session_logs: 0,
    session_log_sets: 0,
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(data.profile)
    .eq('id', userId)
  if (profileError) errors.push(`Profil : ${profileError.message}`)

  // Optional: absent on export files created before this field existed —
  // the coaching_profile row itself always exists already (backfilled/
  // auto-created), so this is an update, never an insert.
  if (data.coaching_profile) {
    const { error: coachingProfileError } = await supabase
      .from('coaching_profile')
      .update(data.coaching_profile)
      .eq('id', userId)
    if (coachingProfileError) {
      errors.push(`Fiche coaching : ${coachingProfileError.message}`)
    }
  }

  if (data.weight_entries.length > 0) {
    const { error } = await supabase.from('weight_entries').upsert(
      data.weight_entries.map(
        ({ id: _id, created_at: _createdAt, updated_at: _updatedAt, ...entry }) => ({
          ...entry,
          user_id: userId,
        }),
      ),
      { onConflict: 'user_id,recorded_at' },
    )
    if (error) errors.push(`Pesées : ${error.message}`)
    else imported.weight_entries = data.weight_entries.length
  }

  const exerciseIdMap = new Map<string, string>()
  for (const exercise of data.exercises) {
    const { id: _id, ...exerciseFields } = exercise
    const { data: created, error } = await supabase
      .from('exercises')
      .insert({ ...exerciseFields, user_id: userId })
      .select('id')
      .single()
    if (error || !created) {
      errors.push(`Exercice "${exercise.name}" : ${error?.message ?? 'erreur inconnue'}`)
      continue
    }
    exerciseIdMap.set(exercise.id, created.id)
    imported.exercises += 1
  }

  const programIdMap = new Map<string, string>()
  for (const program of data.programs) {
    const {
      id: _id,
      created_at: _createdAt,
      updated_at: _updatedAt,
      ...programFields
    } = program
    const { data: created, error } = await supabase
      .from('programs')
      .insert({ ...programFields, user_id: userId })
      .select('id')
      .single()
    if (error || !created) {
      errors.push(`Programme "${program.name}" : ${error?.message ?? 'erreur inconnue'}`)
      continue
    }
    programIdMap.set(program.id, created.id)
    imported.programs += 1
  }

  // Programs get their 7 fixed weekday rows auto-created by a DB trigger the
  // moment they're inserted (see 20260721220320_fixed_weekdays_session_templates.sql)
  // — session_templates has no INSERT policy at all (by design, to preserve
  // the "always exactly 7 days" invariant), so importing a day means finding
  // the day the trigger already created on the new program (matched by
  // day_of_week, the table's real natural key) and updating its day_type,
  // never inserting.
  const templateIdMap = new Map<string, string>()
  if (programIdMap.size > 0) {
    const { data: newTemplates, error: newTemplatesError } = await supabase
      .from('session_templates')
      .select('id, program_id, day_of_week')
      .in('program_id', [...programIdMap.values()])
    if (newTemplatesError) {
      errors.push(`Jours de séance : ${newTemplatesError.message}`)
    } else {
      const templateIdByProgramAndDay = new Map(
        newTemplates.map((t) => [`${t.program_id}:${t.day_of_week}`, t.id]),
      )
      for (const template of data.session_templates) {
        const newProgramId = programIdMap.get(template.program_id)
        if (!newProgramId) {
          errors.push(
            `Jour de séance ${template.id} : programme parent introuvable dans l'import.`,
          )
          continue
        }
        const newTemplateId = templateIdByProgramAndDay.get(
          `${newProgramId}:${template.day_of_week}`,
        )
        if (!newTemplateId) {
          errors.push(
            `Jour de séance ${template.id} : jour ${template.day_of_week} introuvable sur le programme importé.`,
          )
          continue
        }
        const { error: updateError } = await supabase
          .from('session_templates')
          .update({ day_type: template.day_type })
          .eq('id', newTemplateId)
        if (updateError) {
          errors.push(`Jour de séance ${template.id} : ${updateError.message}`)
          continue
        }
        templateIdMap.set(template.id, newTemplateId)
        imported.session_templates += 1
      }
    }
  }

  const templateExerciseIdMap = new Map<string, string>()
  for (const ste of data.session_template_exercises) {
    const templateId = templateIdMap.get(ste.session_template_id)
    if (!templateId) {
      errors.push(
        `Exercice planifié ${ste.id} : jour de séance parent introuvable dans l'import.`,
      )
      continue
    }
    const exerciseId = exerciseIdMap.get(ste.exercise_id) ?? ste.exercise_id
    const {
      id: _id,
      session_template_id: _stId,
      exercise_id: _exId,
      created_at: _createdAt,
      updated_at: _updatedAt,
      ...steFields
    } = ste
    const { data: created, error } = await supabase
      .from('session_template_exercises')
      .insert({
        ...steFields,
        session_template_id: templateId,
        exercise_id: exerciseId,
        user_id: userId,
      })
      .select('id')
      .single()
    if (error || !created) {
      errors.push(
        `Exercice planifié ${ste.id} : ${error?.message ?? 'exercice introuvable dans le catalogue'}`,
      )
      continue
    }
    templateExerciseIdMap.set(ste.id, created.id)
    imported.session_template_exercises += 1
  }

  const logIdMap = new Map<string, string>()
  for (const log of data.session_logs) {
    const programId = programIdMap.get(log.program_id)
    const templateId = templateIdMap.get(log.session_template_id)
    if (!programId || !templateId) {
      errors.push(
        `Séance loguée ${log.id} : programme ou jour parent introuvable dans l'import.`,
      )
      continue
    }
    const {
      id: _id,
      program_id: _programId,
      session_template_id: _stId,
      created_at: _createdAt,
      updated_at: _updatedAt,
      ...logFields
    } = log
    const { data: created, error } = await supabase
      .from('session_logs')
      .insert({
        ...logFields,
        program_id: programId,
        session_template_id: templateId,
        user_id: userId,
      })
      .select('id')
      .single()
    if (error || !created) {
      errors.push(`Séance loguée ${log.id} : ${error?.message ?? 'erreur inconnue'}`)
      continue
    }
    logIdMap.set(log.id, created.id)
    imported.session_logs += 1
  }

  for (const set of data.session_log_sets) {
    const logId = logIdMap.get(set.session_log_id)
    const templateExerciseId = templateExerciseIdMap.get(set.session_template_exercise_id)
    if (!logId || !templateExerciseId) {
      errors.push(
        `Série ${set.id} : séance ou exercice parent introuvable dans l'import.`,
      )
      continue
    }
    const {
      id: _id,
      session_log_id: _logId,
      session_template_exercise_id: _steId,
      created_at: _createdAt,
      updated_at: _updatedAt,
      ...setFields
    } = set
    const { error } = await supabase.from('session_log_sets').insert({
      ...setFields,
      session_log_id: logId,
      session_template_exercise_id: templateExerciseId,
      user_id: userId,
    })
    if (error) {
      errors.push(`Série ${set.id} : ${error.message}`)
      continue
    }
    imported.session_log_sets += 1
  }

  return { imported, errors }
}

export async function deleteAccount(): Promise<void> {
  await invokeEdgeFunction<{ deleted: boolean }>('account-delete', {})
}
