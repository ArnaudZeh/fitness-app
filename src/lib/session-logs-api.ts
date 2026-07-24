import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'
import {
  offlineDb,
  type CachedPlanExercise,
  type CachedSessionPlan,
  type LocalSessionLog,
  type LocalSessionLogSet,
} from '@/lib/offline-db'
import { syncPendingChanges } from '@/lib/offline-sync'
import type { ProgramFocus } from '@/lib/programs-api'

export type SessionLogStatus = 'in_progress' | 'completed'

export interface SessionLog {
  id: string
  user_id: string
  program_id: string
  session_template_id: string
  status: SessionLogStatus
  started_at: string
  completed_at: string | null
}

export interface SessionLogSet {
  id: string
  user_id: string
  session_log_id: string
  session_template_exercise_id: string
  set_number: number
  actual_reps: number
  actual_weight_kg: number
  actual_rpe: number | null
}

export interface SessionLogSetInput {
  session_template_exercise_id: string
  set_number: number
  actual_reps: number
  actual_weight_kg: number
  actual_rpe: number | null
}

function requireUserIdOffline(): string {
  // Reads the in-memory auth store (populated once at app load from
  // Supabase's persisted session) rather than supabase.auth.getUser(),
  // which makes a network round-trip and would fail with no signal.
  const userId = useAuthStore.getState().session?.user.id
  if (!userId) throw new Error('Not authenticated')
  return userId
}

function stripLogDirty(log: LocalSessionLog): SessionLog {
  const { dirty: _dirty, ...rest } = log
  return rest
}

function stripSetDirty(set: LocalSessionLogSet): SessionLogSet {
  const { dirty: _dirty, ...rest } = set
  return rest
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine
}

// Fetches and caches everything SessionLogPage needs to render a day's plan
// offline (program name/focus, day of week, exercises with their targets).
// Falls back to whatever is already cached when there's no network.
export async function cacheSessionPlan(
  programId: string,
  sessionTemplateId: string,
): Promise<CachedSessionPlan | null> {
  if (!isOnline()) {
    return (await offlineDb.sessionPlanCache.get(sessionTemplateId)) ?? null
  }
  try {
    const [programResult, templateResult, slotsResult] = await Promise.all([
      supabase.from('programs').select('*').eq('id', programId).single(),
      supabase.from('session_templates').select('*').eq('id', sessionTemplateId).single(),
      supabase
        .from('session_template_exercises')
        .select('*, exercise:exercises(id, name, muscle_group, image_url)')
        .eq('session_template_id', sessionTemplateId)
        .order('order_index', { ascending: true }),
    ])
    if (programResult.error) throw programResult.error
    if (templateResult.error) throw templateResult.error
    if (slotsResult.error) throw slotsResult.error

    const exercises: CachedPlanExercise[] = slotsResult.data.map((slot) => ({
      id: slot.id,
      exercise_id: slot.exercise.id,
      exercise_name: slot.exercise.name,
      muscle_group: slot.exercise.muscle_group,
      image_url: slot.exercise.image_url,
      order_index: slot.order_index,
      target_sets: slot.target_sets,
      target_reps_min: slot.target_reps_min,
      target_reps_max: slot.target_reps_max,
      target_rpe: slot.target_rpe,
      target_rest_seconds: slot.target_rest_seconds,
      superset_group: slot.superset_group,
    }))

    const plan: CachedSessionPlan = {
      session_template_id: sessionTemplateId,
      program_id: programId,
      program_name: programResult.data.name,
      focus: programResult.data.focus as ProgramFocus,
      day_of_week: templateResult.data.day_of_week,
      exercises,
      cached_at: new Date().toISOString(),
    }
    await offlineDb.sessionPlanCache.put(plan)
    return plan
  } catch {
    return (await offlineDb.sessionPlanCache.get(sessionTemplateId)) ?? null
  }
}

export async function startSessionLog(
  programId: string,
  sessionTemplateId: string,
): Promise<SessionLog> {
  await cacheSessionPlan(programId, sessionTemplateId)
  const userId = requireUserIdOffline()
  const log: LocalSessionLog = {
    id: crypto.randomUUID(),
    user_id: userId,
    program_id: programId,
    session_template_id: sessionTemplateId,
    status: 'in_progress',
    started_at: new Date().toISOString(),
    completed_at: null,
    dirty: 'create',
  }
  await offlineDb.sessionLogs.add(log)
  void syncPendingChanges()
  return stripLogDirty(log)
}

export async function completeSessionLog(id: string): Promise<SessionLog> {
  const existing = await offlineDb.sessionLogs.get(id)
  if (!existing) throw new Error('Session log not found locally')
  const updated: LocalSessionLog = {
    ...existing,
    status: 'completed',
    completed_at: new Date().toISOString(),
    dirty: existing.dirty === 'create' ? 'create' : 'update',
  }
  await offlineDb.sessionLogs.put(updated)
  void syncPendingChanges()
  return stripLogDirty(updated)
}

export async function deleteSessionLog(id: string): Promise<void> {
  const existing = await offlineDb.sessionLogs.get(id)
  if (existing?.dirty === 'create') {
    // Never synced remotely — nothing to delete server-side.
    await offlineDb.sessionLogs.delete(id)
    return
  }
  await offlineDb.sessionLogs.update(id, { dirty: 'delete' })
  void syncPendingChanges()
}

export async function createSessionLogSet(
  sessionLogId: string,
  input: SessionLogSetInput,
): Promise<SessionLogSet> {
  const userId = requireUserIdOffline()
  const set: LocalSessionLogSet = {
    id: crypto.randomUUID(),
    user_id: userId,
    session_log_id: sessionLogId,
    ...input,
    dirty: 'create',
  }
  await offlineDb.sessionLogSets.add(set)
  void syncPendingChanges()
  return stripSetDirty(set)
}

export async function deleteSessionLogSet(id: string): Promise<void> {
  const existing = await offlineDb.sessionLogSets.get(id)
  if (existing?.dirty === 'create') {
    await offlineDb.sessionLogSets.delete(id)
    return
  }
  await offlineDb.sessionLogSets.update(id, { dirty: 'delete' })
  void syncPendingChanges()
}
