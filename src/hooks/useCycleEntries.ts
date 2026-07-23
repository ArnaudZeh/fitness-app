import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/cycle-api'

const cycleEntriesKey = ['cycle-entries'] as const

export function useCycleEntries() {
  return useQuery({ queryKey: cycleEntriesKey, queryFn: api.fetchCycleEntries })
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
