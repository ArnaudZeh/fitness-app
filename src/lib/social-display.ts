import type { Database } from '@/lib/database.types'
import type { MentionCandidate } from '@/lib/mentions'

export type Milestone = Database['public']['Tables']['milestones']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type FeedTargetType = 'milestone' | 'post'

export const MILESTONE_TYPE_LABELS: Record<Milestone['milestone_type'], string> = {
  one_rep_max: 'Nouveau record · 1RM',
  weight_goal: 'Objectif de poids atteint',
}

export function formatMilestoneValue(item: Pick<Milestone, 'milestone_type' | 'value'>): string {
  return `${item.value} kg`
}

export interface LikerSummary {
  userId: string
  displayName: string
}

export interface FeedReactions {
  likeCount: number
  likedByMe: boolean
  commentCount: number
  // Most-recent likers first, capped upstream — enough to render "Aimé par
  // X, Y et Z autres" without shipping every liker for a heavily-liked post.
  likedBy: LikerSummary[]
}

export const LIKED_BY_DISPLAY_LIMIT = 3

// "Aimé par Alice" / "Aimé par Alice et Bob" / "Aimé par Alice, Bob et Chloé"
// / "Aimé par Alice, Bob, Chloé et 4 autres" — likedBy is already capped to
// LIKED_BY_DISPLAY_LIMIT, so totalCount (the real like count) is what
// decides whether an "et N autres" tail is needed.
export function formatLikedBy(likedBy: LikerSummary[], totalCount: number): string | null {
  if (likedBy.length === 0) return null
  const names = likedBy.map((l) => l.displayName)
  const remaining = totalCount - names.length
  if (remaining <= 0) {
    if (names.length === 1) return `Aimé par ${names[0]}`
    return `Aimé par ${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
  }
  return `Aimé par ${names.join(', ')} et ${remaining} autre${remaining > 1 ? 's' : ''}`
}

interface FeedEntryCommon extends FeedReactions {
  id: string
  userId: string
  displayName: string
  avatarUrl: string | null
  occurredAt: string
}

export type MilestoneWithImage = Milestone & {
  exercise: { image_url: string | null } | null
}

export interface MilestoneFeedEntry extends FeedEntryCommon {
  kind: 'milestone'
  milestone: MilestoneWithImage
}

export interface PostFeedEntry extends FeedEntryCommon {
  kind: 'post'
  post: Post
  signedUrl: string | null
  mentions: MentionCandidate[]
}

export type FeedEntry = MilestoneFeedEntry | PostFeedEntry

// Milestones and posts come from two different tables/queries — merged and
// sorted here rather than in SQL, since they don't share a source table to
// order by in the first place.
export function mergeFeedEntries(
  milestoneEntries: MilestoneFeedEntry[],
  postEntries: PostFeedEntry[],
): FeedEntry[] {
  return [...milestoneEntries, ...postEntries].sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  )
}

// P4 du follow asymétrique — classement "Populaire", scopé via
// AskUserQuestion comme une bascule à côté du chronologique par défaut
// (jamais imposé), pondéré par la fraîcheur pour éviter qu'un vieux post
// très aimé reste coincé en tête indéfiniment. `+2` au dénominateur évite
// une division par ~0 pour un post vieux de quelques secondes (qui
// dominerait sinon n'importe quel post avec ne serait-ce qu'un like).
const POPULARITY_SCORE_HOURS_OFFSET = 2

export function computePopularityScore(
  entry: Pick<FeedEntry, 'likeCount' | 'commentCount' | 'occurredAt'>,
  now: Date = new Date(),
): number {
  const ageHours = (now.getTime() - new Date(entry.occurredAt).getTime()) / (1000 * 60 * 60)
  const engagement = entry.likeCount + entry.commentCount
  return engagement / (Math.max(ageHours, 0) + POPULARITY_SCORE_HOURS_OFFSET)
}

export function sortFeedByPopularity(entries: FeedEntry[], now: Date = new Date()): FeedEntry[] {
  return [...entries].sort((a, b) => computePopularityScore(b, now) - computePopularityScore(a, now))
}
