import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type BreathProtocol = Database['public']['Tables']['breath_protocols']['Row']
export type BreathSessionLog =
  Database['public']['Tables']['breath_session_logs']['Row']

export interface BreathProtocolInput {
  name: string
  hold_seconds: number
  recovery_seconds: number
  cycles: number
}

export interface BreathSessionLogInput {
  protocol_id: string
  completed_cycles: number
  started_at: string
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchBreathProtocols(): Promise<BreathProtocol[]> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('breath_protocols')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createBreathProtocol(
  input: BreathProtocolInput,
): Promise<BreathProtocol> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('breath_protocols')
    .insert({ ...input, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBreathProtocol(
  id: string,
  patch: Partial<BreathProtocolInput>,
): Promise<BreathProtocol> {
  const { data, error } = await supabase
    .from('breath_protocols')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBreathProtocol(id: string): Promise<void> {
  const { error } = await supabase.from('breath_protocols').delete().eq('id', id)
  if (error) throw error
}

export async function logBreathSession(
  input: BreathSessionLogInput,
): Promise<BreathSessionLog> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('breath_session_logs')
    .insert({ ...input, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}
