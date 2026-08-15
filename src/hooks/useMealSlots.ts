import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/meal-slots-api'

const mealSlotsKey = ['meal-slots'] as const

export function useMealSlots() {
  return useQuery({ queryKey: mealSlotsKey, queryFn: api.fetchMealSlots })
}

export function useCreateMealSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, orderIndex }: { name: string; orderIndex: number }) =>
      api.createMealSlot(name, orderIndex),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: mealSlotsKey }),
  })
}

export function useRenameMealSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.renameMealSlot(id, name),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: mealSlotsKey }),
  })
}

export function useRemoveMealSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.removeMealSlot(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: mealSlotsKey }),
  })
}
