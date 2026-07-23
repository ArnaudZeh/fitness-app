import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/cycle-api'

const cycleEntriesKey = ['cycle-entries'] as const

// `enabled` lets couche-IA callers skip fetching cycle data entirely for
// users who haven't opted into the module — the same opt-in strictness as
// everywhere else the module appears, not just a UI gate on /cycle.
export function useCycleEntries(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: cycleEntriesKey,
    queryFn: api.fetchCycleEntries,
    enabled: options.enabled ?? true,
  })
}

export function useCreateCycleEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (startDate: string) => api.createCycleEntry(startDate),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cycleEntriesKey }),
  })
}

export function useUpdateCycleEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, startDate }: { id: string; startDate: string }) =>
      api.updateCycleEntry(id, startDate),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cycleEntriesKey }),
  })
}

export function useDeleteCycleEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteCycleEntry(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cycleEntriesKey }),
  })
}
