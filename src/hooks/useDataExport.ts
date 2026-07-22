import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteAccount,
  downloadUserDataExport,
  exportUserData,
  importUserData,
  type ImportResult,
  type UserDataExport,
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

// Scoped to exactly the query keys import can affect — a blanket
// invalidateQueries() would also refetch unrelated *active* queries (e.g. a
// currently-mounted program detail page), which stacks extra load on top of
// whatever else is already in flight and made an unrelated delete-then-navigate
// flow measurably flakier during testing.
export function useImportUserData() {
  const queryClient = useQueryClient()
  return useMutation<ImportResult, Error, UserDataExport>({
    mutationFn: (data) => importUserData(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      void queryClient.invalidateQueries({ queryKey: ['weight-entries'] })
      void queryClient.invalidateQueries({ queryKey: ['programs'] })
      void queryClient.invalidateQueries({ queryKey: ['exercises'] })
      void queryClient.invalidateQueries({ queryKey: ['set-history'] })
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
