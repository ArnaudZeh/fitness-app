import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/coaching-profile-api'

const coachingProfileKey = ['coaching-profile'] as const

export function useCoachingProfile() {
  return useQuery({ queryKey: coachingProfileKey, queryFn: api.fetchCoachingProfile })
}

export function useUpdateCoachingProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: api.CoachingProfileInput) => api.updateCoachingProfile(patch),
    onSuccess: (updated) => queryClient.setQueryData(coachingProfileKey, updated),
  })
}
