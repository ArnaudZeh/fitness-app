import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/social-api'
import * as postsApi from '@/lib/posts-api'
import * as reactionsApi from '@/lib/reactions-api'
import type { FeedTargetType } from '@/lib/social-display'
import type { Post } from '@/lib/social-display'

const feedKey = ['social-feed'] as const
const commentsKey = (targetType: FeedTargetType, targetId: string) =>
  ['feed-comments', targetType, targetId] as const

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

export function useCreatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: postsApi.CreatePostInput) => postsApi.createPost(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: feedKey }),
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (post: Pick<Post, 'id' | 'storage_path'>) => postsApi.deletePost(post),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: feedKey }),
  })
}

export function useToggleLike() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      targetType,
      targetId,
      likedByMe,
    }: {
      targetType: FeedTargetType
      targetId: string
      likedByMe: boolean
    }) => reactionsApi.toggleLike(targetType, targetId, likedByMe),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: feedKey }),
  })
}

export function useComments(targetType: FeedTargetType, targetId: string, enabled: boolean) {
  return useQuery({
    queryKey: commentsKey(targetType, targetId),
    queryFn: () => reactionsApi.fetchComments(targetType, targetId),
    enabled,
  })
}

export function useAddComment(targetType: FeedTargetType, targetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => reactionsApi.addComment(targetType, targetId, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKey(targetType, targetId) })
      void queryClient.invalidateQueries({ queryKey: feedKey })
    },
  })
}

export function useDeleteComment(targetType: FeedTargetType, targetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reactionsApi.deleteComment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKey(targetType, targetId) })
      void queryClient.invalidateQueries({ queryKey: feedKey })
    },
  })
}
