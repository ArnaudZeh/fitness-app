import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/assistant-api'

const assistantMessagesKey = ['assistant-messages'] as const
const activeProgramSnapshotKey = ['assistant-active-program-snapshot'] as const

export function useAssistantMessages() {
  return useQuery({ queryKey: assistantMessagesKey, queryFn: api.fetchAssistantMessages })
}

export function useActiveProgramSnapshot() {
  return useQuery({
    queryKey: activeProgramSnapshotKey,
    queryFn: api.fetchActiveProgramSnapshot,
  })
}

export function useSendAssistantMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: api.SendAssistantMessageParams) => api.sendAssistantMessage(params),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: assistantMessagesKey }),
  })
}

export function useApplyAssistantProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (message: api.AssistantMessage) => api.applyAssistantProposal(message),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assistantMessagesKey })
      void queryClient.invalidateQueries({ queryKey: ['programs'] })
      void queryClient.invalidateQueries({ queryKey: activeProgramSnapshotKey })
    },
  })
}

export function useClearAssistantConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.clearAssistantConversation(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: assistantMessagesKey }),
  })
}
