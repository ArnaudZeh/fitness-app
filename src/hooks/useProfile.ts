import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/profile-api'

const profileKey = ['profile'] as const

export function useProfile() {
  return useQuery({ queryKey: profileKey, queryFn: api.fetchProfile })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<api.ProfileInput>) => api.updateProfile(patch),
    onSuccess: (updated) => queryClient.setQueryData(profileKey, updated),
  })
}
