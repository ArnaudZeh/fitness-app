import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/social-api'
import * as postsApi from '@/lib/posts-api'
import * as reactionsApi from '@/lib/reactions-api'
import * as mentionsApi from '@/lib/mentions-api'
import { notifyActivity } from '@/lib/activity-notifications-api'
import { extractMentions, uniqueMentionedUserIds } from '@/lib/mentions'
import { useFriendsData } from '@/hooks/useFriends'
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
  const { data: friends } = useFriendsData()
  return useMutation({
    mutationFn: async (input: postsApi.CreatePostInput) => {
      const post = await postsApi.createPost(input)
      if (input.content && friends) {
        const candidates = friends.friends.map((f) => ({ userId: f.userId, displayName: f.displayName }))
        const mentionedIds = uniqueMentionedUserIds(extractMentions(input.content, candidates))
        if (mentionedIds.length > 0) {
          await mentionsApi.createMentionNotifications('post', post.id, mentionedIds).catch(() => {})
        }
      }
      return post
    },
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
    mutationFn: async ({
      targetType,
      targetId,
      likedByMe,
      contentOwnerId,
    }: {
      targetType: FeedTargetType
      targetId: string
      likedByMe: boolean
      contentOwnerId: string
    }) => {
      await reactionsApi.toggleLike(targetType, targetId, likedByMe)
      // Only the like transition notifies — unliking is not an event the
      // owner needs to hear about.
      if (!likedByMe) {
        await notifyActivity('like', targetType, targetId, contentOwnerId).catch(() => {})
      }
    },
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

export function useAddComment(
  targetType: FeedTargetType,
  targetId: string,
  contentOwnerId: string,
) {
  const queryClient = useQueryClient()
  const { data: friends } = useFriendsData()
  return useMutation({
    mutationFn: async (content: string) => {
      const comment = await reactionsApi.addComment(targetType, targetId, content)
      await notifyActivity('comment', targetType, targetId, contentOwnerId).catch(() => {})
      if (friends) {
        const candidates = friends.friends.map((f) => ({ userId: f.userId, displayName: f.displayName }))
        const mentionedIds = uniqueMentionedUserIds(extractMentions(content, candidates))
        if (mentionedIds.length > 0) {
          await mentionsApi.createMentionNotifications('comment', comment.id, mentionedIds).catch(() => {})
        }
      }
      return comment
    },
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
