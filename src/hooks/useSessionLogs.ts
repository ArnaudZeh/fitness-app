import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import { offlineDb, type LocalSessionLogSet } from '@/lib/offline-db'
import * as api from '@/lib/session-logs-api'
import type { SessionLog, SessionLogSet } from '@/lib/session-logs-api'
import {
  refreshSessionLogCache,
  refreshSessionLogSetsCache,
  refreshSessionLogsCache,
  syncPendingChanges,
} from '@/lib/offline-sync'

function stripDirty<T extends { dirty: unknown }>(row: T): Omit<T, 'dirty'> {
  const { dirty: _dirty, ...rest } = row
  return rest
}

export function useSessionLogs(programId: string): SessionLog[] | undefined {
  useEffect(() => {
    void refreshSessionLogsCache(programId)
    void syncPendingChanges()
  }, [programId])

  const logs = useLiveQuery(
    () => offlineDb.sessionLogs.where('program_id').equals(programId).toArray(),
    [programId],
  )

  return logs
    ?.filter((log) => log.dirty !== 'delete')
    .map(stripDirty)
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
}

// isRefreshing distinguishes "still checking the network" from "genuinely
// not found" — useLiveQuery alone can't tell those apart, and a session log
// just created offline won't exist server-side yet to refresh against.
export function useSessionLog(id: string): {
  data: SessionLog | undefined
  isRefreshing: boolean
} {
  // Tracks which ids have completed a refresh attempt, rather than a plain
  // boolean reset in the effect body — a fresh id is "not yet refreshed" by
  // simply not being in the set yet, no explicit setState-on-mount needed.
  const [refreshedIds, setRefreshedIds] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    let cancelled = false
    void Promise.all([refreshSessionLogCache(id), syncPendingChanges()]).finally(() => {
      if (!cancelled) setRefreshedIds((prev) => new Set(prev).add(id))
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const log = useLiveQuery(() => offlineDb.sessionLogs.get(id), [id])
  return {
    data: log && log.dirty !== 'delete' ? stripDirty(log) : undefined,
    isRefreshing: !refreshedIds.has(id),
  }
}

// networkMode: 'always' on every mutation below — these write to Dexie
// first (never touch the network directly), so they must run regardless of
// navigator.onLine. TanStack Query's default networkMode: 'online' would
// otherwise pause the mutation indefinitely while offline, which defeats
// the entire point of an offline-first write path.

export function useStartSessionLog(programId: string) {
  return useMutation({
    mutationFn: (sessionTemplateId: string) =>
      api.startSessionLog(programId, sessionTemplateId),
    networkMode: 'always',
  })
}

export function useCompleteSessionLog(id: string) {
  return useMutation({
    mutationFn: () => api.completeSessionLog(id),
    networkMode: 'always',
  })
}

export function useDeleteSessionLog() {
  return useMutation({
    mutationFn: (id: string) => api.deleteSessionLog(id),
    networkMode: 'always',
  })
}

// sessionLogId is optional so callers can look up an on-the-side log (e.g.
// "whichever session happened last time for this slot") without having to
// know it exists yet — undefined just means "nothing to fetch".
export function useSessionLogSets(
  sessionLogId: string | undefined,
): SessionLogSet[] | undefined {
  useEffect(() => {
    if (!sessionLogId) return
    void refreshSessionLogSetsCache(sessionLogId)
    void syncPendingChanges()
  }, [sessionLogId])

  const sets = useLiveQuery(() => {
    if (!sessionLogId) return Promise.resolve<LocalSessionLogSet[]>([])
    return offlineDb.sessionLogSets.where('session_log_id').equals(sessionLogId).toArray()
  }, [sessionLogId])

  return sets?.filter((set) => set.dirty !== 'delete').map(stripDirty)
}

export function useCreateSessionLogSet(sessionLogId: string) {
  return useMutation({
    mutationFn: (input: api.SessionLogSetInput) =>
      api.createSessionLogSet(sessionLogId, input),
    networkMode: 'always',
  })
}

export function useDeleteSessionLogSet() {
  return useMutation({
    mutationFn: (id: string) => api.deleteSessionLogSet(id),
    networkMode: 'always',
  })
}

export function useSessionPlan(programId: string, sessionTemplateId: string) {
  useEffect(() => {
    void api.cacheSessionPlan(programId, sessionTemplateId)
  }, [programId, sessionTemplateId])

  return useLiveQuery(
    () => offlineDb.sessionPlanCache.get(sessionTemplateId),
    [sessionTemplateId],
  )
}
