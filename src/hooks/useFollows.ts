import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/follows-api'
import { useAuthStore } from '@/lib/auth-store'

const feedKey = ['social-feed'] as const
const isFollowingKey = (followedId: string) => ['is-following', followedId] as const
const followerCountKey = (userId: string) => ['follower-count', userId] as const
const followingCountKey = (userId: string) => ['following-count', userId] as const
const suggestionsKey = ['follow-suggestions'] as const

export function useFollowSuggestions() {
  return useQuery({
    queryKey: suggestionsKey,
    queryFn: () => api.fetchFollowSuggestions(),
  })
}

export function useIsFollowing(followedId: string) {
  return useQuery({
    queryKey: isFollowingKey(followedId),
    queryFn: () => api.fetchIsFollowing(followedId),
  })
}

export function useFollowerCount(userId: string) {
  return useQuery({
    queryKey: followerCountKey(userId),
    queryFn: () => api.fetchFollowerCount(userId),
  })
}

export function useFollowingCount(userId: string) {
  return useQuery({
    queryKey: followingCountKey(userId),
    queryFn: () => api.fetchFollowingCount(userId),
  })
}

// Suivre/ne plus suivre déplace les compteurs des deux côtés de la
// relation à la fois : le sien (following) et celui de la cible
// (followers) — jamais un seul des deux.
export function useFollowUser() {
  const queryClient = useQueryClient()
  const myUserId = useAuthStore((state) => state.session?.user.id)
  return useMutation({
    mutationFn: (followedId: string) => api.followUser(followedId),
    onSuccess: (_data, followedId) => {
      void queryClient.invalidateQueries({ queryKey: isFollowingKey(followedId) })
      void queryClient.invalidateQueries({ queryKey: feedKey })
      void queryClient.invalidateQueries({ queryKey: followerCountKey(followedId) })
      if (myUserId) void queryClient.invalidateQueries({ queryKey: followingCountKey(myUserId) })
      void queryClient.invalidateQueries({ queryKey: suggestionsKey })
    },
  })
}

export function useUnfollowUser() {
  const queryClient = useQueryClient()
  const myUserId = useAuthStore((state) => state.session?.user.id)
  return useMutation({
    mutationFn: (followedId: string) => api.unfollowUser(followedId),
    onSuccess: (_data, followedId) => {
      void queryClient.invalidateQueries({ queryKey: isFollowingKey(followedId) })
      void queryClient.invalidateQueries({ queryKey: feedKey })
      void queryClient.invalidateQueries({ queryKey: followerCountKey(followedId) })
      if (myUserId) void queryClient.invalidateQueries({ queryKey: followingCountKey(myUserId) })
      void queryClient.invalidateQueries({ queryKey: suggestionsKey })
    },
  })
}
