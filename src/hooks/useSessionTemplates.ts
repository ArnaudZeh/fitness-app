import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/sessions-api'
import type { SessionTemplate, SessionTemplateExercise } from '@/lib/sessions-api'

const templatesKey = (blockId: string) =>
  ['blocks', blockId, 'session-templates'] as const
const exercisesKey = (templateId: string) =>
  ['session-templates', templateId, 'exercises'] as const
const sessionsKey = (blockId: string) => ['blocks', blockId, 'sessions'] as const

export function useSessionTemplates(blockId: string) {
  return useQuery({
    queryKey: templatesKey(blockId),
    queryFn: () => api.fetchSessionTemplates(blockId),
  })
}

export function useCreateSessionTemplate(blockId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.createSessionTemplate(blockId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey(blockId) }),
  })
}

export function useUpdateSessionTemplate(blockId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.updateSessionTemplate(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey(blockId) }),
  })
}

export function useDeleteSessionTemplate(blockId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteSessionTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey(blockId) }),
  })
}

export function useSwapSessionTemplateOrder(blockId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ a, b }: { a: SessionTemplate; b: SessionTemplate }) =>
      api.swapSessionTemplateOrder(a, b),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey(blockId) }),
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

export function useSessions(blockId: string) {
  return useQuery({
    queryKey: sessionsKey(blockId),
    queryFn: () => api.fetchSessions(blockId),
  })
}

export function useGenerateBlockSessions(blockId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.generateBlockSessions(blockId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionsKey(blockId) }),
  })
}
