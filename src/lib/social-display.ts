import type { Database } from '@/lib/database.types'

export type Milestone = Database['public']['Tables']['milestones']['Row']
export type ProgressPhoto = Database['public']['Tables']['progress_photos']['Row']

export const MILESTONE_TYPE_LABELS: Record<Milestone['milestone_type'], string> = {
  one_rep_max: 'Nouveau record — 1RM estimé',
  weekly_tonnage: 'Nouveau record — tonnage hebdo',
  regularity_streak: 'Nouveau record — régularité',
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

interface FeedEntryCommon {
  id: string
  userId: string
  displayName: string
  occurredAt: string
}

export interface MilestoneFeedEntry extends FeedEntryCommon {
  kind: 'milestone'
  milestone: Milestone
}

export interface PhotoFeedEntry extends FeedEntryCommon {
  kind: 'photo'
  photo: ProgressPhoto
  signedUrl: string
}

export type FeedEntry = MilestoneFeedEntry | PhotoFeedEntry

// Milestones and photos come from two different tables/queries — merged
// and sorted here rather than in SQL, since a photo's "date" (photo_date)
// and a milestone's "date" (achieved_at, a timestamp) aren't the same kind
// of value to begin with.
export function mergeFeedEntries(
  milestoneEntries: MilestoneFeedEntry[],
  photoEntries: PhotoFeedEntry[],
): FeedEntry[] {
  return [...milestoneEntries, ...photoEntries].sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  )
}
