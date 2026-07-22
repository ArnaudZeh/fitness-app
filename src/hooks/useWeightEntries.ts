import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/weight-api'

const weightEntriesKey = ['weight-entries'] as const

export function useWeightEntries() {
  return useQuery({ queryKey: weightEntriesKey, queryFn: api.fetchWeightEntries })
}

export function useLogWeightEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ weightKg, recordedAt }: { weightKg: number; recordedAt: string }) =>
      api.logWeightEntry(weightKg, recordedAt),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: weightEntriesKey }),
  })
}

export function useDeleteWeightEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteWeightEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: weightEntriesKey }),
  })
}
