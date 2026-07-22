import { invokeEdgeFunction } from '@/lib/edge-function'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

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

export async function exportUserData(): Promise<UserDataExport> {
  const userId = await requireUserId()

  const profileResult = await supabase
    .from('profiles')
    .select('display_name, date_of_birth, sex, height_cm, goal, target_weight_kg')
    .eq('id', userId)
    .single()
  if (profileResult.error) throw profileResult.error

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

export async function deleteAccount(): Promise<void> {
  await invokeEdgeFunction<{ deleted: boolean }>('account-delete', {})
}
