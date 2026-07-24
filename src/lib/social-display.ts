import type { Database } from '@/lib/database.types'

export type Milestone = Database['public']['Tables']['milestones']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type FeedTargetType = 'milestone' | 'post'

export const MILESTONE_TYPE_LABELS: Record<Milestone['milestone_type'], string> = {
  one_rep_max: 'Nouveau record · 1RM estimé',
  weekly_tonnage: 'Nouveau record · tonnage hebdo',
  regularity_streak: 'Nouveau record · régularité',
}

// one_rep_max keeps decimal precision (a specific lift weight) — the other
// two are aggregates/counts where a whole number reads more cleanly.
export function formatMilestoneValue(item: Pick<Milestone, 'milestone_type' | 'value'>): string {
  if (item.milestone_type === 'regularity_streak') {
    const weeks = Math.round(item.value)
    return `${weeks} semaine${weeks > 1 ? 's' : ''} d'affilée`
  }
  if (item.milestone_type === 'weekly_tonnage') {
    return `${Math.round(item.value)} kg cette semaine-là`
  }
  return `${item.value} kg`
}

export interface FeedReactions {
  likeCount: number
  likedByMe: boolean
  commentCount: number
}

interface FeedEntryCommon extends FeedReactions {
  id: string
  userId: string
  displayName: string
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
