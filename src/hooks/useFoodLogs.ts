import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/food-logs-api'

function foodLogsKey(loggedDate: string) {
  return ['food-logs', loggedDate] as const
}

const recentFoodLogNamesKey = ['recent-food-log-names'] as const

export function useFoodLogs(loggedDate: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: foodLogsKey(loggedDate),
    queryFn: () => api.fetchFoodLogsForDate(loggedDate),
    enabled: options.enabled ?? true,
  })
}

// Local date math duplicated here rather than extracted — same precedent as
// toLocalDateString() across the rest of the app (see project history).
function isoDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Feeds the couche IA nutrition context (buildNutritionContext) — a rolling
// window ending today, e.g. days=7 covers the last 7 calendar days
// including today.
export function useRecentFoodLogs(days: number) {
  const sinceDate = isoDateDaysAgo(days - 1)
  return useQuery({
    queryKey: ['food-logs', 'recent', sinceDate],
    queryFn: () => api.fetchFoodLogsSince(sinceDate),
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

// Drives both the per-meal and whole-day "Dupliquer" buttons: which day to
// offer duplicating from, and whether to offer it at all (null = nothing to
// duplicate). `mealSlotId` omitted scopes the search across every meal.
export function useMostRecentLoggedDate(beforeDate: string, mealSlotId?: string) {
  return useQuery({
    queryKey: ['food-logs', 'most-recent-date', beforeDate, mealSlotId ?? 'any'],
    queryFn: () => api.fetchMostRecentLoggedDate(beforeDate, mealSlotId),
  })
}

export function useDuplicateMealSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { mealSlotId: string; fromDate: string; toDate: string }) =>
      api.duplicateFoodLogsForMealSlot(input.mealSlotId, input.fromDate, input.toDate),
    onSuccess: (_count, variables) => {
      void queryClient.invalidateQueries({ queryKey: foodLogsKey(variables.toDate) })
      void queryClient.invalidateQueries({ queryKey: recentFoodLogNamesKey })
    },
  })
}

// Whole-day duplicate: one call per still-empty meal slot rather than a
// bespoke bulk endpoint — data volumes here are a handful of slots with a
// handful of items each, not worth a dedicated RPC. Slots that had nothing
// logged on `fromDate` either just contribute 0 and are silently skipped
// (duplicateFoodLogsForMealSlot's existing behavior).
export function useDuplicateDay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { mealSlotIds: string[]; fromDate: string; toDate: string }) => {
      let total = 0
      for (const mealSlotId of input.mealSlotIds) {
        total += await api.duplicateFoodLogsForMealSlot(mealSlotId, input.fromDate, input.toDate)
      }
      return total
    },
    onSuccess: (_count, variables) => {
      void queryClient.invalidateQueries({ queryKey: foodLogsKey(variables.toDate) })
      void queryClient.invalidateQueries({ queryKey: recentFoodLogNamesKey })
    },
  })
}
