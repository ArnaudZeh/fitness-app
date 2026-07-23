import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/social-api'
import * as photosApi from '@/lib/progress-photos-api'
import type { ProgressPhoto } from '@/lib/social-display'

const feedKey = ['social-feed'] as const

export function useSocialFeed() {
  return useQuery({ queryKey: feedKey, queryFn: api.fetchFeed })
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteMilestone(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: feedKey }),
  })
}

export function useUploadProgressPhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, input }: { file: File; input: photosApi.UploadProgressPhotoInput }) =>
      photosApi.uploadProgressPhoto(file, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: feedKey }),
  })
}

export function useDeleteProgressPhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (photo: Pick<ProgressPhoto, 'id' | 'storage_path'>) =>
      photosApi.deleteProgressPhoto(photo),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: feedKey }),
  })
}
