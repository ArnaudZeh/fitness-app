import { supabase } from '@/lib/supabase'
import { offlineDb } from '@/lib/offline-db'
import type { SessionLogStatus } from '@/lib/session-logs-api'

let syncing = false

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine
}

// Postgres foreign_key_violation — the parent row (program/session log) was
// deleted before this one ever synced. It can never succeed, so retrying
// forever would just spin; drop it instead of leaving it dirty indefinitely.
function isForeignKeyViolation(error: { code?: string } | null): boolean {
  return error?.code === '23503'
}

// Pushes every locally-dirty row to Supabase, oldest dependency first (a
// set can't sync before the log it belongs to exists remotely). Safe to
// call repeatedly — rows that fail (still offline, transient error) are
// simply left dirty for the next attempt.
export async function syncPendingChanges(): Promise<void> {
  if (syncing || !isOnline()) return
  syncing = true
  try {
    await syncDirtyLogs()
    await syncDirtySets()
  } finally {
    syncing = false
  }
}

async function syncDirtyLogs(): Promise<void> {
  const logs = await offlineDb.sessionLogs.toArray()
  for (const log of logs) {
    if (!log.dirty) continue
    try {
      if (log.dirty === 'delete') {
        const { error } = await supabase.from('session_logs').delete().eq('id', log.id)
        if (error) continue
        await offlineDb.sessionLogs.delete(log.id)
        continue
      }
      const { error } = await supabase.from('session_logs').upsert({
        id: log.id,
        user_id: log.user_id,
        program_id: log.program_id,
        session_template_id: log.session_template_id,
        status: log.status,
        started_at: log.started_at,
        completed_at: log.completed_at,
      })
      if (error) {
        if (isForeignKeyViolation(error)) await offlineDb.sessionLogs.delete(log.id)
        continue
      }
      await offlineDb.sessionLogs.update(log.id, { dirty: null })
    } catch {
      // Offline or transient network error — leave dirty, retry next pass.
    }
  }
}

async function syncDirtySets(): Promise<void> {
  const [sets, logs] = await Promise.all([
    offlineDb.sessionLogSets.toArray(),
    offlineDb.sessionLogs.toArray(),
  ])
  const logById = new Map(logs.map((log) => [log.id, log]))

  for (const set of sets) {
    if (!set.dirty) continue
    const parentLog = logById.get(set.session_log_id)
    // Parent log hasn't synced yet — its own sync pass will run first next
    // time; syncing this set now would violate the FK on the server.
    if (set.dirty === 'create' && parentLog?.dirty === 'create') continue

    try {
      if (set.dirty === 'delete') {
        const { error } = await supabase
          .from('session_log_sets')
          .delete()
          .eq('id', set.id)
        if (error) continue
        await offlineDb.sessionLogSets.delete(set.id)
        continue
      }
      const { error } = await supabase.from('session_log_sets').upsert({
        id: set.id,
        user_id: set.user_id,
        session_log_id: set.session_log_id,
        session_template_exercise_id: set.session_template_exercise_id,
        set_number: set.set_number,
        actual_reps: set.actual_reps,
        actual_weight_kg: set.actual_weight_kg,
        actual_rpe: set.actual_rpe,
        exercise_id: set.exercise_id,
      })
      if (error) {
        if (isForeignKeyViolation(error)) await offlineDb.sessionLogSets.delete(set.id)
        continue
      }
      await offlineDb.sessionLogSets.update(set.id, { dirty: null })
    } catch {
      // Offline or transient network error — leave dirty, retry next pass.
    }
  }
}

// Read-through cache refresh for the session logs list (program history):
// pulls remote rows into Dexie so the view works offline too, without ever
// clobbering a row that has local changes still pending sync.
export async function refreshSessionLogsCache(programId: string): Promise<void> {
  if (!isOnline()) return
  try {
    const { data, error } = await supabase
      .from('session_logs')
      .select('*')
      .eq('program_id', programId)
    if (error || !data) return
    for (const row of data) {
      const existing = await offlineDb.sessionLogs.get(row.id)
      if (existing?.dirty) continue
      await offlineDb.sessionLogs.put({
        id: row.id,
        user_id: row.user_id,
        program_id: row.program_id,
        session_template_id: row.session_template_id,
        status: row.status as SessionLogStatus,
        started_at: row.started_at,
        completed_at: row.completed_at,
        dirty: null,
      })
    }
  } catch {
    // Offline — the existing Dexie cache (if any) stands as-is.
  }
}

// Same as refreshSessionLogsCache but across every program the user has,
// not just one — used for dashboard stats ("séances réalisées") that must
// count a session regardless of which program it belongs to.
export async function refreshAllSessionLogsCache(): Promise<void> {
  if (!isOnline()) return
  try {
    const { data, error } = await supabase.from('session_logs').select('*')
    if (error || !data) return
    for (const row of data) {
      const existing = await offlineDb.sessionLogs.get(row.id)
      if (existing?.dirty) continue
      await offlineDb.sessionLogs.put({
        id: row.id,
        user_id: row.user_id,
        program_id: row.program_id,
        session_template_id: row.session_template_id,
        status: row.status as SessionLogStatus,
        started_at: row.started_at,
        completed_at: row.completed_at,
        dirty: null,
      })
    }
  } catch {
    // Offline — the existing Dexie cache (if any) stands as-is.
  }
}

// Read-through cache refresh for one session's logged sets — covers viewing
// a session created on another device, or before this cache existed.
export async function refreshSessionLogSetsCache(sessionLogId: string): Promise<void> {
  if (!isOnline()) return
  try {
    const { data, error } = await supabase
      .from('session_log_sets')
      .select('*')
      .eq('session_log_id', sessionLogId)
    if (error || !data) return
    for (const row of data) {
      const existing = await offlineDb.sessionLogSets.get(row.id)
      if (existing?.dirty) continue
      await offlineDb.sessionLogSets.put({
        id: row.id,
        user_id: row.user_id,
        session_log_id: row.session_log_id,
        session_template_exercise_id: row.session_template_exercise_id,
        set_number: row.set_number,
        actual_reps: row.actual_reps,
        actual_weight_kg: row.actual_weight_kg,
        actual_rpe: row.actual_rpe,
        exercise_id: row.exercise_id,
        dirty: null,
      })
    }
  } catch {
    // Offline — the existing Dexie cache (if any) stands as-is.
  }
}

// Same as refreshSessionLogSetsCache but for several logs at once — used to
// pull in "last time" history that spans more than just the single most
// recent prior session (see useSessionLogSetsForLogs).
export async function refreshSessionLogSetsCacheForLogs(
  sessionLogIds: string[],
): Promise<void> {
  if (!isOnline() || sessionLogIds.length === 0) return
  try {
    const { data, error } = await supabase
      .from('session_log_sets')
      .select('*')
      .in('session_log_id', sessionLogIds)
    if (error || !data) return
    for (const row of data) {
      const existing = await offlineDb.sessionLogSets.get(row.id)
      if (existing?.dirty) continue
      await offlineDb.sessionLogSets.put({
        id: row.id,
        user_id: row.user_id,
        session_log_id: row.session_log_id,
        session_template_exercise_id: row.session_template_exercise_id,
        set_number: row.set_number,
        actual_reps: row.actual_reps,
        actual_weight_kg: row.actual_weight_kg,
        actual_rpe: row.actual_rpe,
        exercise_id: row.exercise_id,
        dirty: null,
      })
    }
  } catch {
    // Offline — the existing Dexie cache (if any) stands as-is.
  }
}

// Read-through cache refresh for one session log itself (status/timestamps)
// — same rationale as the sets refresh above.
export async function refreshSessionLogCache(id: string): Promise<void> {
  if (!isOnline()) return
  try {
    const { data, error } = await supabase
      .from('session_logs')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) return
    const existing = await offlineDb.sessionLogs.get(id)
    if (existing?.dirty) return
    await offlineDb.sessionLogs.put({
      id: data.id,
      user_id: data.user_id,
      program_id: data.program_id,
      session_template_id: data.session_template_id,
      status: data.status as SessionLogStatus,
      started_at: data.started_at,
      completed_at: data.completed_at,
      dirty: null,
    })
  } catch {
    // Offline — the existing Dexie cache (if any) stands as-is.
  }
}

// navigator.onLine only reflects whether the radio is on, not whether
// requests actually succeed — on weak/dropping 4G (the realistic day-to-day
// case, vs. true airplane-mode) it can read "online" while every request
// times out. The 'online' event alone would miss that: a failed write during
// a signal dip could sit dirty until the user happens to trigger another
// write. This periodic retry catches it regardless of which page is open.
const RETRY_INTERVAL_MS = 20_000

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void syncPendingChanges())
  setInterval(() => void syncPendingChanges(), RETRY_INTERVAL_MS)
}
