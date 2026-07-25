import { useQuery } from '@tanstack/react-query'
import { fetchFriendProfile } from '@/lib/friend-profile-api'

export function useFriendProfile(userId: string) {
  return useQuery({
    queryKey: ['friend-profile', userId],
    queryFn: () => fetchFriendProfile(userId),
  })
}
