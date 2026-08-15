import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Heart, MessageCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/Avatar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ExerciseThumbnail } from '@/components/ExerciseThumbnail'
import { MentionField } from '@/components/MentionField'
import { useAuthStore } from '@/lib/auth-store'
import { useFriendsData } from '@/hooks/useFriends'
import { useMarkMentionsRead } from '@/hooks/useMentions'
import { useMarkActivityNotificationsRead } from '@/hooks/useActivityNotifications'
import {
  useAddComment,
  useComments,
  useCreatePost,
  useDeleteComment,
  useDeleteMilestone,
  useDeletePost,
  useSocialFeed,
  useToggleLike,
} from '@/hooks/useSocialFeed'
import { formatLikedBy, formatMilestoneValue, MILESTONE_TYPE_LABELS } from '@/lib/social-display'
import type { FeedEntry, FeedTargetType, LikerSummary } from '@/lib/social-display'
import { extractMentions } from '@/lib/mentions'
import type { MentionCandidate } from '@/lib/mentions'

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

// Highlights "@Nom" for whoever was actually tagged in this piece of
// content (passed in as `mentions`, fetched alongside the post/comment) —
// not a guess from the current viewer's own friends list, which wouldn't
// necessarily include everyone the author is friends with.
function MentionedText({ text, mentions }: { text: string; mentions: MentionCandidate[] }) {
  const matches = extractMentions(text, mentions)
  if (matches.length === 0) return <>{text}</>

  const parts: ReactNode[] = []
  let cursor = 0
  matches.forEach((match, index) => {
    if (match.start > cursor) parts.push(text.slice(cursor, match.start))
    parts.push(
      <Link
        key={index}
        to={`/friends/${match.userId}`}
        className="rounded-md bg-secondary/15 px-1 py-0.5 font-medium text-secondary hover:underline"
      >
        @{match.displayName}
      </Link>,
    )
    cursor = match.end
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts}</>
}

export function FeedPage() {
  const { data: feed, isLoading, isError } = useSocialFeed()
  const currentUserId = useAuthStore((state) => state.session?.user.id)
  const deleteMilestone = useDeleteMilestone()
  const deletePost = useDeletePost()
  const { data: friends } = useFriendsData()
  const incomingRequestsCount = friends?.incomingRequests.length ?? 0
  const { mutate: markMentionsRead } = useMarkMentionsRead()
  const { mutate: markActivityNotificationsRead } = useMarkActivityNotificationsRead()

  // The mention/activity notification badges are meant to clear just by
  // opening the Feed, unlike friend requests which need an explicit
  // accept/decline.
  useEffect(() => {
    markMentionsRead()
    markActivityNotificationsRead()
  }, [markMentionsRead, markActivityNotificationsRead])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Feed</h1>
        <Link to="/friends" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
          Gérer mes amis →
          {incomingRequestsCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {incomingRequestsCount > 9 ? '9+' : incomingRequestsCount}
            </span>
          )}
        </Link>
      </div>

      <CreatePostCard />

      {isLoading && <p className="text-muted-foreground">Chargement…</p>}
      {isError && (
        <p role="alert" className="text-destructive">
          Impossible de charger le feed.
        </p>
      )}

      {feed && feed.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Rien pour l'instant. Les objectifs de poids atteints, les records et les posts de tes
              amis apparaîtront ici. Ajoute des amis pour commencer.
            </p>
          </CardContent>
        </Card>
      )}

      {feed && feed.length > 0 && (
        <ul className="flex flex-col gap-3">
          {feed.map((entry) => (
            <li key={`${entry.kind}-${entry.id}`}>
              {entry.kind === 'milestone' ? (
                <MilestoneCard
                  entry={entry}
                  isOwn={entry.userId === currentUserId}
                  onDelete={() => deleteMilestone.mutateAsync(entry.milestone.id)}
                />
              ) : (
                <PostCard
                  entry={entry}
                  isOwn={entry.userId === currentUserId}
                  onDelete={() => deletePost.mutateAsync(entry.post)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FeedCardHeader({
  userId,
  displayName,
  avatarUrl,
  isOwn,
  onDelete,
  deleteLabel,
}: {
  userId: string
  displayName: string
  avatarUrl: string | null
  isOwn: boolean
  onDelete: () => Promise<void>
  deleteLabel: string
}) {
  return (
    <CardHeader>
      <CardTitle as="h2" className="flex items-center justify-between gap-2 text-base">
        <Link
          to={isOwn ? '/profile' : `/friends/${userId}`}
          className="flex items-center gap-2 hover:underline"
        >
          <Avatar url={avatarUrl} displayName={displayName} size="sm" />
          {displayName}
        </Link>
        {isOwn && (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" size="icon-sm" aria-label={deleteLabel}>
                <Trash2 />
              </Button>
            }
            title="Supprimer cette entrée du feed ?"
            description="Cette action est irréversible."
            confirmLabel="Supprimer"
            onConfirm={onDelete}
          />
        )}
      </CardTitle>
    </CardHeader>
  )
}

function ReactionBar({
  targetType,
  targetId,
  contentOwnerId,
  likeCount,
  likedByMe,
  likedBy,
  commentCount,
}: {
  targetType: FeedTargetType
  targetId: string
  contentOwnerId: string
  likeCount: number
  likedByMe: boolean
  likedBy: LikerSummary[]
  commentCount: number
}) {
  const toggleLike = useToggleLike()
  const [commentsOpen, setCommentsOpen] = useState(false)
  const likedByLabel = formatLikedBy(likedBy, likeCount)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={toggleLike.isPending}
          className={likedByMe ? 'text-primary' : ''}
          onClick={() => toggleLike.mutate({ targetType, targetId, likedByMe, contentOwnerId })}
        >
          <Heart className={likedByMe ? 'fill-current' : ''} />
          {likeCount > 0 && likeCount}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCommentsOpen((open) => !open)}
        >
          <MessageCircle />
          {commentCount > 0 && commentCount}
        </Button>
      </div>
      {likedByLabel && <p className="text-xs text-muted-foreground">{likedByLabel}</p>}
      {commentsOpen && (
        <CommentsSection targetType={targetType} targetId={targetId} contentOwnerId={contentOwnerId} />
      )}
    </div>
  )
}

function CommentsSection({
  targetType,
  targetId,
  contentOwnerId,
}: {
  targetType: FeedTargetType
  targetId: string
  contentOwnerId: string
}) {
  const { data: comments, isLoading } = useComments(targetType, targetId, true)
  const addComment = useAddComment(targetType, targetId, contentOwnerId)
  const deleteComment = useDeleteComment(targetType, targetId)
  const currentUserId = useAuthStore((state) => state.session?.user.id)
  const { data: friends } = useFriendsData()
  const mentionCandidates: MentionCandidate[] = friends?.friends ?? []
  const [draft, setDraft] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (draft.trim() === '') return
    addComment.mutate(draft.trim(), { onSuccess: () => setDraft('') })
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-2">
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {(comments ?? []).map((comment) => (
        <div key={comment.id} className="flex items-start justify-between gap-2 text-sm">
          <p>
            <span className="font-medium">{comment.displayName}</span>{' '}
            <MentionedText text={comment.content} mentions={comment.mentions} />
          </p>
          {comment.user_id === currentUserId && (
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Supprimer ce commentaire"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              }
              title="Supprimer ce commentaire ?"
              description="Cette action est irréversible."
              confirmLabel="Supprimer"
              onConfirm={() => deleteComment.mutateAsync(comment.id)}
            />
          )}
        </div>
      ))}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-1">
          <MentionField
            value={draft}
            onChange={setDraft}
            candidates={mentionCandidates}
            placeholder="Ajouter un commentaire… (@ pour taguer un ami)"
            disabled={addComment.isPending}
          />
        </div>
        <Button type="submit" size="sm" disabled={draft.trim() === '' || addComment.isPending}>
          Envoyer
        </Button>
      </form>
    </div>
  )
}

function MilestoneCard({
  entry,
  isOwn,
  onDelete,
}: {
  entry: Extract<FeedEntry, { kind: 'milestone' }>
  isOwn: boolean
  onDelete: () => Promise<void>
}) {
  const { milestone } = entry
  return (
    <Card>
      <FeedCardHeader
        userId={entry.userId}
        displayName={entry.displayName}
        avatarUrl={entry.avatarUrl}
        isOwn={isOwn}
        onDelete={onDelete}
        deleteLabel="Supprimer ce record du feed"
      />
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {milestone.exercise_id && (
            <ExerciseThumbnail imageUrl={milestone.exercise?.image_url ?? null} muscleGroup={null} />
          )}
          <p className="font-medium">
            {MILESTONE_TYPE_LABELS[milestone.milestone_type]}
            {milestone.exercise_name && ` · ${milestone.exercise_name}`}
          </p>
        </div>
        <p className="font-mono text-lg font-semibold tabular-nums">
          {formatMilestoneValue(milestone)}
        </p>
        <p className="text-sm text-muted-foreground">{formatTimestamp(milestone.achieved_at)}</p>
        <ReactionBar
          targetType="milestone"
          targetId={milestone.id}
          contentOwnerId={entry.userId}
          likeCount={entry.likeCount}
          likedByMe={entry.likedByMe}
          likedBy={entry.likedBy}
          commentCount={entry.commentCount}
        />
      </CardContent>
    </Card>
  )
}

function PostCard({
  entry,
  isOwn,
  onDelete,
}: {
  entry: Extract<FeedEntry, { kind: 'post' }>
  isOwn: boolean
  onDelete: () => Promise<void>
}) {
  const { post } = entry
  return (
    <Card>
      <FeedCardHeader
        userId={entry.userId}
        displayName={entry.displayName}
        avatarUrl={entry.avatarUrl}
        isOwn={isOwn}
        onDelete={onDelete}
        deleteLabel="Supprimer ce post du feed"
      />
      <CardContent className="flex flex-col gap-2">
        {entry.signedUrl && (
          <img
            src={entry.signedUrl}
            alt={post.content ?? 'Photo publiée'}
            className="max-h-96 w-full rounded-md object-cover"
          />
        )}
        {post.content && (
          <p className="text-sm">
            <MentionedText text={post.content} mentions={entry.mentions} />
          </p>
        )}
        <p className="text-sm text-muted-foreground">{formatTimestamp(post.created_at)}</p>
        <ReactionBar
          targetType="post"
          targetId={post.id}
          contentOwnerId={entry.userId}
          likeCount={entry.likeCount}
          likedByMe={entry.likedByMe}
          likedBy={entry.likedBy}
          commentCount={entry.commentCount}
        />
      </CardContent>
    </Card>
  )
}

function CreatePostCard() {
  const createPost = useCreatePost()
  const { data: friends } = useFriendsData()
  const mentionCandidates: MentionCandidate[] = friends?.friends ?? []
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function removePhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  async function handleSubmit() {
    await createPost.mutateAsync({
      content: content.trim() === '' ? null : content.trim(),
      file: selectedFile,
    })
    setContent('')
    removePhoto()
  }

  const canSubmit = content.trim() !== '' || selectedFile !== null

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Créer un post</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <MentionField
          value={content}
          onChange={setContent}
          candidates={mentionCandidates}
          placeholder="Partage une pensée, une victoire… (@ pour taguer un ami)"
          multiline
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Choisir une photo"
          className="hidden"
          onChange={handleFileChange}
        />

        {previewUrl ? (
          <div className="flex flex-col gap-2">
            <img
              src={previewUrl}
              alt="Aperçu"
              className="max-h-64 w-full rounded-md object-cover"
            />
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={removePhoto}>
              Retirer la photo
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => fileInputRef.current?.click()}
          >
            Ajouter une photo
          </Button>
        )}

        {createPost.isError && (
          <p role="alert" className="text-sm text-destructive">
            Impossible de publier ce post.
          </p>
        )}

        <Button
          type="button"
          size="sm"
          className="self-start"
          disabled={!canSubmit || createPost.isPending}
          onClick={() => void handleSubmit()}
        >
          {createPost.isPending ? 'Publication…' : 'Publier'}
        </Button>
      </CardContent>
    </Card>
  )
}
