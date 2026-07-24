import Dexie, { type EntityTable } from 'dexie'
import type { ProgramFocus } from '@/lib/programs-api'
import type { SessionLogStatus } from '@/lib/session-logs-api'

// Local-first cache + write queue for the session-logging domain (the one
// part of the app the brief requires to work with zero network — logging a
// full workout in a signal-dead gym basement, syncing once back online).
// `dirty` marks a row with changes not yet pushed to Supabase; a row that
// only exists as a read-through cache (fetched while online, never edited
// locally) has `dirty: null`.

export interface CachedPlanExercise {
  id: string
  exercise_id: string
  exercise_name: string
  muscle_group: string | null
  image_url: string | null
  order_index: number
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  target_rpe: number | null
  target_rest_seconds: number | null
  superset_group: string | null
}

export interface CachedSessionPlan {
  session_template_id: string
  program_id: string
  program_name: string
  focus: ProgramFocus
  day_of_week: number
  exercises: CachedPlanExercise[]
  cached_at: string
}

export type DirtyState = 'create' | 'update' | 'delete' | null

export interface LocalSessionLog {
  id: string
  user_id: string
  program_id: string
  session_template_id: string
  status: SessionLogStatus
  started_at: string
  completed_at: string | null
  dirty: DirtyState
}

export interface LocalSessionLogSet {
  id: string
  user_id: string
  session_log_id: string
  session_template_exercise_id: string
  set_number: number
  actual_reps: number
  actual_weight_kg: number
  actual_rpe: number | null
  dirty: 'create' | 'delete' | null
}

export const offlineDb = new Dexie('fitness-offline') as Dexie & {
  sessionPlanCache: EntityTable<CachedSessionPlan, 'session_template_id'>
  sessionLogs: EntityTable<LocalSessionLog, 'id'>
  sessionLogSets: EntityTable<LocalSessionLogSet, 'id'>
}

offlineDb.version(1).stores({
  sessionPlanCache: 'session_template_id, program_id',
  sessionLogs: 'id, program_id, session_template_id',
  sessionLogSets: 'id, session_log_id',
})
