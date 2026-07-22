import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/wellness-api'

const activitiesKey = ['wellness-activities'] as const
const logsKey = (start: string, end: string) =>
  ['wellness-activity-logs', start, end] as const

export function useWellnessActivities() {
  return useQuery({ queryKey: activitiesKey, queryFn: api.fetchWellnessActivities })
}

export function useCreateWellnessActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.WellnessActivityInput) => api.createWellnessActivity(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: activitiesKey }),
  })
}

export function useUpdateWellnessActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<api.WellnessActivityInput & { active: boolean }>
    }) => api.updateWellnessActivity(id, patch),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: activitiesKey }),
  })
}

export function useDeleteWellnessActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteWellnessActivity(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: activitiesKey }),
  })
}

export function useWellnessActivityLogs(startDate: string, endDate: string) {
  return useQuery({
    queryKey: logsKey(startDate, endDate),
    queryFn: () => api.fetchWellnessActivityLogs(startDate, endDate),
  })
}

export function useLogWellnessActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, date }: { activityId: string; date: string }) =>
      api.logWellnessActivity(activityId, date),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['wellness-activity-logs'] }),
  })
}

export function useUnlogWellnessActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, date }: { activityId: string; date: string }) =>
      api.unlogWellnessActivity(activityId, date),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['wellness-activity-logs'] }),
  })
}
