import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type SessionLogStatus = 'in_progress' | 'completed'

type SessionLogRow = Database['public']['Tables']['session_logs']['Row']

export interface SessionLog extends Omit<SessionLogRow, 'status'> {
  status: SessionLogStatus
}

export type SessionLogSet = Database['public']['Tables']['session_log_sets']['Row']

export interface SessionLogSetInput {
  session_template_exercise_id: string
  set_number: number
  actual_reps: number
  actual_weight_kg: number
  actual_rpe: number | null
}

function toSessionLog(row: SessionLogRow): SessionLog {
  return { ...row, status: row.status as SessionLogStatus }
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchSessionLogs(programId: string): Promise<SessionLog[]> {
  const { data, error } = await supabase
    .from('session_logs')
    .select('*')
    .eq('program_id', programId)
    .order('started_at', { ascending: false })
  if (error) throw error
  return data.map(toSessionLog)
}

export async function fetchSessionLog(id: string): Promise<SessionLog> {
  const { data, error } = await supabase
    .from('session_logs')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return toSessionLog(data)
}

export async function startSessionLog(
  programId: string,
  sessionTemplateId: string,
): Promise<SessionLog> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('session_logs')
    .insert({
      user_id: userId,
      program_id: programId,
      session_template_id: sessionTemplateId,
    })
    .select()
    .single()
  if (error) throw error
  return toSessionLog(data)
}

export async function completeSessionLog(id: string): Promise<SessionLog> {
  const { data, error } = await supabase
    .from('session_logs')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toSessionLog(data)
}

export async function deleteSessionLog(id: string): Promise<void> {
  const { error } = await supabase.from('session_logs').delete().eq('id', id)
  if (error) throw error
}

export async function fetchSessionLogSets(
  sessionLogId: string,
): Promise<SessionLogSet[]> {
  const { data, error } = await supabase
    .from('session_log_sets')
    .select('*')
    .eq('session_log_id', sessionLogId)
    .order('set_number', { ascending: true })
  if (error) throw error
  return data
}

export async function createSessionLogSet(
  sessionLogId: string,
  input: SessionLogSetInput,
): Promise<SessionLogSet> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('session_log_sets')
    .insert({ ...input, session_log_id: sessionLogId, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSessionLogSet(id: string): Promise<void> {
  const { error } = await supabase.from('session_log_sets').delete().eq('id', id)
  if (error) throw error
}
