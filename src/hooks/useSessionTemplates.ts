import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/sessions-api'
import type { SessionTemplate, SessionTemplateExercise } from '@/lib/sessions-api'

const templatesKey = (programId: string) =>
  ['programs', programId, 'session-templates'] as const
const exercisesKey = (templateId: string) =>
  ['session-templates', templateId, 'exercises'] as const

export function useSessionTemplates(programId: string) {
  return useQuery({
    queryKey: templatesKey(programId),
    queryFn: () => api.fetchSessionTemplates(programId),
  })
}

export function useCreateSessionTemplate(programId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.createSessionTemplate(programId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey(programId) }),
  })
}

export function useUpdateSessionTemplate(programId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.updateSessionTemplate(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey(programId) }),
  })
}

export function useDeleteSessionTemplate(programId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteSessionTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey(programId) }),
  })
}

export function useSwapSessionTemplateOrder(programId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ a, b }: { a: SessionTemplate; b: SessionTemplate }) =>
      api.swapSessionTemplateOrder(a, b),
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
