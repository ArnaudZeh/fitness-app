import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/session-logs-api'

const logsKey = (programId: string) => ['programs', programId, 'session-logs'] as const
const logKey = (id: string) => ['session-logs', id] as const
const setsKey = (sessionLogId: string) => ['session-logs', sessionLogId, 'sets'] as const

export function useSessionLogs(programId: string) {
  return useQuery({
    queryKey: logsKey(programId),
    queryFn: () => api.fetchSessionLogs(programId),
  })
}

export function useSessionLog(id: string) {
  return useQuery({
    queryKey: logKey(id),
    queryFn: () => api.fetchSessionLog(id),
  })
}

export function useStartSessionLog(programId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionTemplateId: string) =>
      api.startSessionLog(programId, sessionTemplateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: logsKey(programId) }),
  })
}

export function useCompleteSessionLog(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.completeSessionLog(id),
    onSuccess: (updated) => queryClient.setQueryData(logKey(id), updated),
  })
}

export function useDeleteSessionLog(programId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteSessionLog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: logsKey(programId) }),
  })
}

export function useSessionLogSets(sessionLogId: string) {
  return useQuery({
    queryKey: setsKey(sessionLogId),
    queryFn: () => api.fetchSessionLogSets(sessionLogId),
  })
}

export function useCreateSessionLogSet(sessionLogId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.SessionLogSetInput) =>
      api.createSessionLogSet(sessionLogId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: setsKey(sessionLogId) }),
  })
}

export function useDeleteSessionLogSet(sessionLogId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteSessionLogSet(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: setsKey(sessionLogId) }),
  })
}
