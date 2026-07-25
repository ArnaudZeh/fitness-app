import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/mentions-api'

const unreadMentionsKey = ['mentions-unread-count'] as const

export function useUnreadMentionsCount() {
  return useQuery({ queryKey: unreadMentionsKey, queryFn: api.fetchUnreadMentionsCount })
}

export function useMarkMentionsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.markMentionsRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: unreadMentionsKey }),
  })
}
