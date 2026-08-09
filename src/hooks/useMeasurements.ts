import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/measurements-api'

const measurementsKey = ['body-measurements'] as const

export function useMeasurements() {
  return useQuery({ queryKey: measurementsKey, queryFn: api.fetchMeasurements })
}

export function useLogMeasurement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      input,
      recordedAt,
    }: {
      input: api.MeasurementInput
      recordedAt: string
    }) => api.logMeasurement(input, recordedAt),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: measurementsKey }),
  })
}

export function useDeleteMeasurement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteMeasurement(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: measurementsKey }),
  })
}
