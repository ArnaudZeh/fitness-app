import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/activity-notifications-api'

const unreadActivityKey = ['activity-notifications-unread-count'] as const

export function useUnreadActivityNotificationsCount() {
  return useQuery({
    queryKey: unreadActivityKey,
    queryFn: api.fetchUnreadActivityNotificationsCount,
  })
}

export function useMarkActivityNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.markActivityNotificationsRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: unreadActivityKey }),
  })
}
