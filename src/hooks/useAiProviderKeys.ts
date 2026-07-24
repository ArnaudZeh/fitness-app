import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/ai-keys-api'

const aiProviderKeysKey = ['ai-provider-keys'] as const

export function useAiProviderKeys() {
  return useQuery({
    queryKey: aiProviderKeysKey,
    queryFn: api.fetchAiProviderKeyStatuses,
  })
}

export function useSaveAiProviderKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ provider, apiKey }: { provider: api.AiProvider; apiKey: string }) =>
      api.saveAiProviderKey(provider, apiKey),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: aiProviderKeysKey }),
  })
}

export function useTestAiProviderKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider: api.AiProvider) => api.testAiProviderKey(provider),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: aiProviderKeysKey }),
  })
}

export function useDeleteAiProviderKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider: api.AiProvider) => api.deleteAiProviderKey(provider),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: aiProviderKeysKey }),
  })
}
