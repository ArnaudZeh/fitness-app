import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/avatar-api'

const profileKey = ['profile'] as const
const avatarUrlKey = (path: string) => ['avatar-url', path] as const

export function useAvatarUrl(path: string | null) {
  return useQuery({
    queryKey: avatarUrlKey(path ?? ''),
    queryFn: () => api.getSignedAvatarUrl(path as string),
    enabled: path !== null,
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => api.uploadAvatar(file),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: profileKey }),
  })
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.removeAvatar,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: profileKey }),
  })
}
