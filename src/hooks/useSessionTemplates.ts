import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/sessions-api'
import type { DayType, SessionTemplateExercise } from '@/lib/sessions-api'

const templatesKey = (programId: string) =>
  ['programs', programId, 'session-templates'] as const
const templateKey = (id: string) => ['session-templates', id] as const
const exercisesKey = (templateId: string) =>
  ['session-templates', templateId, 'exercises'] as const

export function useSessionTemplates(programId: string) {
  return useQuery({
    queryKey: templatesKey(programId),
    queryFn: () => api.fetchSessionTemplates(programId),
  })
}

export function useSessionTemplate(id: string) {
  return useQuery({
    queryKey: templateKey(id),
    queryFn: () => api.fetchSessionTemplate(id),
  })
}

export function useUpdateSessionTemplateDayType(programId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dayType }: { id: string; dayType: DayType }) =>
      api.updateSessionTemplateDayType(id, dayType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey(programId) }),
  })
}

export function useSessionTemplateExercises(templateId: string) {
  return useQuery({
    queryKey: exercisesKey(templateId),
    queryFn: () => api.fetchSessionTemplateExercises(templateId),
  })
}

export function useCreateSessionTemplateExercise(templateId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.SessionTemplateExerciseInput) =>
      api.createSessionTemplateExercise(templateId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: exercisesKey(templateId) }),
  })
}

export function useUpdateSessionTemplateExercise(templateId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: api.SessionTemplateExerciseInput
    }) => api.updateSessionTemplateExercise(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: exercisesKey(templateId) }),
  })
}

export function useDeleteSessionTemplateExercise(templateId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteSessionTemplateExercise(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: exercisesKey(templateId) }),
  })
}

export function useSwapSessionTemplateExerciseOrder(templateId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ a, b }: { a: SessionTemplateExercise; b: SessionTemplateExercise }) =>
      api.swapSessionTemplateExerciseOrder(a, b),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: exercisesKey(templateId) }),
  })
}
