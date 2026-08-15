import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/nutrition-targets-api'

const nutritionTargetsKey = ['nutrition-targets'] as const

export function useNutritionTargets() {
  return useQuery({ queryKey: nutritionTargetsKey, queryFn: api.fetchNutritionTargets })
}

export function useUpdateNutritionTargets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<api.NutritionTargetsInput>) => api.updateNutritionTargets(patch),
    onSuccess: (updated) => queryClient.setQueryData(nutritionTargetsKey, updated),
  })
}
