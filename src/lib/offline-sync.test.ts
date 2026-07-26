import { beforeEach, describe, expect, it, vi } from 'vitest'
import { offlineDb } from '@/lib/offline-db'
import type { LocalSessionLog, LocalSessionLogSet } from '@/lib/offline-db'
import { syncPendingChanges } from '@/lib/offline-sync'

const upsertLogs = vi.fn()
const upsertSets = vi.fn()
const deleteLogs = vi.fn()
const deleteSets = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'session_logs') {
        return {
          upsert: upsertLogs,
          delete: () => ({ eq: deleteLogs }),
        }
      }
      if (table === 'session_log_sets') {
        return {
          upsert: upsertSets,
          delete: () => ({ eq: deleteSets }),
        }
      }
      throw new Error(`Unexpected table in test mock: ${table}`)
    },
  },
}))

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true })
}

function makeLog(overrides: Partial<LocalSessionLog> = {}): LocalSessionLog {
  return {
    id: 'log-1',
    user_id: 'user-1',
    program_id: 'program-1',
    session_template_id: 'template-1',
    status: 'in_progress',
    started_at: '2026-07-22T10:00:00.000Z',
    completed_at: null,
    dirty: 'create',
    ...overrides,
  }
}

function makeSet(overrides: Partial<LocalSessionLogSet> = {}): LocalSessionLogSet {
  return {
    id: 'set-1',
    user_id: 'user-1',
    session_log_id: 'log-1',
    session_template_exercise_id: 'slot-1',
    set_number: 1,
    side: 'both',
    actual_reps: 8,
    actual_weight_kg: 60,
    actual_rpe: null,
    dirty: 'create',
    ...overrides,
  }
}

describe('syncPendingChanges', () => {
  beforeEach(async () => {
    await offlineDb.sessionLogs.clear()
    await offlineDb.sessionLogSets.clear()
    await offlineDb.sessionPlanCache.clear()
    upsertLogs.mockReset().mockResolvedValue({ error: null })
    upsertSets.mockReset().mockResolvedValue({ error: null })
    deleteLogs.mockReset().mockResolvedValue({ error: null })
    deleteSets.mockReset().mockResolvedValue({ error: null })
    setOnline(true)
  })

  it('pushes a newly created log and clears its dirty flag on success', async () => {
    await offlineDb.sessionLogs.add(makeLog())

    await syncPendingChanges()

    expect(upsertLogs).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'log-1', status: 'in_progress' }),
    )
    const stored = await offlineDb.sessionLogs.get('log-1')
    expect(stored?.dirty).toBeNull()
  })

  it('leaves a log dirty when the push fails, so it retries later', async () => {
    upsertLogs.mockResolvedValue({ error: { message: 'offline' } })
    await offlineDb.sessionLogs.add(makeLog())

    await syncPendingChanges()

    const stored = await offlineDb.sessionLogs.get('log-1')
    expect(stored?.dirty).toBe('create')
  })

  it('does not attempt anything when offline', async () => {
    setOnline(false)
    await offlineDb.sessionLogs.add(makeLog())

    await syncPendingChanges()

    expect(upsertLogs).not.toHaveBeenCalled()
    const stored = await offlineDb.sessionLogs.get('log-1')
    expect(stored?.dirty).toBe('create')
  })

  it('does not sync a set until its parent log has synced (FK ordering)', async () => {
    upsertLogs.mockResolvedValue({ error: { message: 'still offline' } })
    await offlineDb.sessionLogs.add(makeLog())
    await offlineDb.sessionLogSets.add(makeSet())

    await syncPendingChanges()

    expect(upsertSets).not.toHaveBeenCalled()
    const storedSet = await offlineDb.sessionLogSets.get('set-1')
    expect(storedSet?.dirty).toBe('create')
  })

  it('syncs a set once its parent log is already synced', async () => {
    await offlineDb.sessionLogs.add(makeLog({ dirty: null }))
    await offlineDb.sessionLogSets.add(makeSet())

    await syncPendingChanges()

    expect(upsertSets).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'set-1', actual_weight_kg: 60 }),
    )
    const storedSet = await offlineDb.sessionLogSets.get('set-1')
    expect(storedSet?.dirty).toBeNull()
  })

  it('syncs a log and its set together in one pass', async () => {
    await offlineDb.sessionLogs.add(makeLog())
    await offlineDb.sessionLogSets.add(makeSet())

    await syncPendingChanges()

    expect(upsertLogs).toHaveBeenCalled()
    expect(upsertSets).toHaveBeenCalled()
    expect((await offlineDb.sessionLogs.get('log-1'))?.dirty).toBeNull()
    expect((await offlineDb.sessionLogSets.get('set-1'))?.dirty).toBeNull()
  })

  it('deletes a locally-deleted log from Dexie once the remote delete succeeds', async () => {
    await offlineDb.sessionLogs.add(makeLog({ dirty: 'delete' }))

    await syncPendingChanges()

    expect(deleteLogs).toHaveBeenCalledWith('id', 'log-1')
    expect(await offlineDb.sessionLogs.get('log-1')).toBeUndefined()
  })

  it('deletes a locally-deleted set from Dexie once the remote delete succeeds', async () => {
    await offlineDb.sessionLogs.add(makeLog({ dirty: null }))
    await offlineDb.sessionLogSets.add(makeSet({ dirty: 'delete' }))

    await syncPendingChanges()

    expect(deleteSets).toHaveBeenCalledWith('id', 'set-1')
    expect(await offlineDb.sessionLogSets.get('set-1')).toBeUndefined()
  })

  it('keeps a locally-deleted row when the remote delete fails', async () => {
    deleteLogs.mockResolvedValue({ error: { message: 'offline' } })
    await offlineDb.sessionLogs.add(makeLog({ dirty: 'delete' }))

    await syncPendingChanges()

    const stored = await offlineDb.sessionLogs.get('log-1')
    expect(stored?.dirty).toBe('delete')
  })

  it('drops a log that can never sync because its program was deleted first', async () => {
    upsertLogs.mockResolvedValue({ error: { code: '23503', message: 'fk violation' } })
    await offlineDb.sessionLogs.add(makeLog())

    await syncPendingChanges()

    expect(await offlineDb.sessionLogs.get('log-1')).toBeUndefined()
  })

  it('drops a set that can never sync because its log was deleted first', async () => {
    upsertSets.mockResolvedValue({ error: { code: '23503', message: 'fk violation' } })
    await offlineDb.sessionLogs.add(makeLog({ dirty: null }))
    await offlineDb.sessionLogSets.add(makeSet())

    await syncPendingChanges()

    expect(await offlineDb.sessionLogSets.get('set-1')).toBeUndefined()
  })
})
