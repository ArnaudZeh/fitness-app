import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/friends-api'

const friendsKey = ['friends'] as const
const feedKey = ['social-feed'] as const
const userSearchKey = (query: string) => ['user-search', query] as const

export function useFriendsData() {
  return useQuery({ queryKey: friendsKey, queryFn: api.fetchFriendsData })
}

export function useUserSearch(query: string) {
  return useQuery({
    queryKey: userSearchKey(query),
    queryFn: () => api.searchUsers(query),
    enabled: query.trim() !== '',
  })
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (addresseeId: string) => api.sendFriendRequest(addresseeId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: friendsKey }),
  })
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendshipId: string) => api.acceptFriendRequest(friendshipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: friendsKey })
      void queryClient.invalidateQueries({ queryKey: feedKey })
    },
  })
}

export function useRemoveFriendship() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendshipId: string) => api.removeFriendship(friendshipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: friendsKey })
      void queryClient.invalidateQueries({ queryKey: feedKey })
    },
  })
}
