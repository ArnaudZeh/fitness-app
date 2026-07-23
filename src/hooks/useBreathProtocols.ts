import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/breath-api'

const protocolsKey = ['breath-protocols'] as const

export function useBreathProtocols() {
  return useQuery({ queryKey: protocolsKey, queryFn: api.fetchBreathProtocols })
}

export function useCreateBreathProtocol() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.BreathProtocolInput) => api.createBreathProtocol(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: protocolsKey }),
  })
}

export function useUpdateBreathProtocol() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<api.BreathProtocolInput>
    }) => api.updateBreathProtocol(id, patch),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: protocolsKey }),
  })
}

export function useDeleteBreathProtocol() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteBreathProtocol(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: protocolsKey }),
  })
}

export function useLogBreathSession() {
  return useMutation({
    mutationFn: (input: api.BreathSessionLogInput) => api.logBreathSession(input),
  })
}
