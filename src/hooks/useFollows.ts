import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/follows-api'

const feedKey = ['social-feed'] as const
const isFollowingKey = (followedId: string) => ['is-following', followedId] as const

export function useIsFollowing(followedId: string) {
  return useQuery({
    queryKey: isFollowingKey(followedId),
    queryFn: () => api.fetchIsFollowing(followedId),
  })
}

export function useFollowUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (followedId: string) => api.followUser(followedId),
    onSuccess: (_data, followedId) => {
      void queryClient.invalidateQueries({ queryKey: isFollowingKey(followedId) })
      void queryClient.invalidateQueries({ queryKey: feedKey })
    },
  })
}

export function useUnfollowUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (followedId: string) => api.unfollowUser(followedId),
    onSuccess: (_data, followedId) => {
      void queryClient.invalidateQueries({ queryKey: isFollowingKey(followedId) })
      void queryClient.invalidateQueries({ queryKey: feedKey })
    },
  })
}
