import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/social-api'

const feedKey = ['social-feed'] as const

export function useSocialFeed() {
  return useQuery({ queryKey: feedKey, queryFn: api.fetchFeed })
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteMilestone(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: feedKey }),
  })
}
