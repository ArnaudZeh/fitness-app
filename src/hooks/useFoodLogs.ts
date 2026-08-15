import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/food-logs-api'

function foodLogsKey(loggedDate: string) {
  return ['food-logs', loggedDate] as const
}

const recentFoodLogNamesKey = ['recent-food-log-names'] as const

export function useFoodLogs(loggedDate: string) {
  return useQuery({
    queryKey: foodLogsKey(loggedDate),
    queryFn: () => api.fetchFoodLogsForDate(loggedDate),
  })
}

export function useRecentFoodLogNames() {
  return useQuery({
    queryKey: recentFoodLogNamesKey,
    queryFn: api.fetchRecentFoodLogNames,
  })
}

export function useCreateFoodLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.FoodLogInput) => api.createFoodLog(input),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: foodLogsKey(created.logged_date) })
      void queryClient.invalidateQueries({ queryKey: recentFoodLogNamesKey })
    },
  })
}

export function useDeleteFoodLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; loggedDate: string }) => api.deleteFoodLog(id),
    onSuccess: (_data, variables) =>
      void queryClient.invalidateQueries({ queryKey: foodLogsKey(variables.loggedDate) }),
  })
}
