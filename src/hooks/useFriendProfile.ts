import { useQuery } from '@tanstack/react-query'
import { fetchFriendProfile, ProfileNotVisibleError } from '@/lib/friend-profile-api'

export function useFriendProfile(userId: string) {
  return useQuery({
    queryKey: ['friend-profile', userId],
    queryFn: () => fetchFriendProfile(userId),
    // A private/inaccessible profile is a permanent outcome, not a transient
    // network failure — retrying it just delays showing "ce profil est
    // privé" for no benefit. Other errors keep the default retry behavior.
    retry: (failureCount, error) =>
      !(error instanceof ProfileNotVisibleError) && failureCount < 3,
  })
}
