import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/exercises-api'

const exercisesKey = ['exercises'] as const

export function useExercises() {
  return useQuery({ queryKey: exercisesKey, queryFn: api.fetchExercises })
}

export function useCreateExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; muscle_group: string | null }) =>
      api.createExercise(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exercisesKey }),
  })
}
