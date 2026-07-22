import { useMutation } from '@tanstack/react-query'
import {
  deleteAccount,
  downloadUserDataExport,
  exportUserData,
} from '@/lib/data-export-api'
import { offlineDb } from '@/lib/offline-db'
import { supabase } from '@/lib/supabase'

export function useExportUserData() {
  return useMutation({
    mutationFn: async () => {
      const data = await exportUserData()
      downloadUserDataExport(data)
    },
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      await deleteAccount()
      await Promise.all([
        offlineDb.sessionPlanCache.clear(),
        offlineDb.sessionLogs.clear(),
        offlineDb.sessionLogSets.clear(),
      ])
      await supabase.auth.signOut()
    },
  })
}
