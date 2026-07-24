import { describe, expect, it } from 'vitest'
import { formatMilestoneValue, mergeFeedEntries } from '@/lib/social-display'
import type { MilestoneFeedEntry, MilestoneWithImage, Post, PostFeedEntry } from '@/lib/social-display'

describe('formatMilestoneValue', () => {
  it('shows one_rep_max with decimal precision', () => {
    expect(formatMilestoneValue({ milestone_type: 'one_rep_max', value: 126.04 })).toBe(
      '126.04 kg',
    )
  })

  it('rounds weekly_tonnage to a whole number', () => {
    expect(formatMilestoneValue({ milestone_type: 'weekly_tonnage', value: 899.6 })).toBe(
      '900 kg cette semaine-là',
    )
  })

  it('pluralizes regularity_streak correctly', () => {
    expect(formatMilestoneValue({ milestone_type: 'regularity_streak', value: 1 })).toBe(
      "1 semaine d'affilée",
    )
    expect(formatMilestoneValue({ milestone_type: 'regularity_streak', value: 4 })).toBe(
      "4 semaines d'affilée",
    )
  })
})

const noReactions = { likeCount: 0, likedByMe: false, commentCount: 0 }

function fakeMilestoneEntry(id: string, occurredAt: string): MilestoneFeedEntry {
  const milestone: MilestoneWithImage = {
    id,
    user_id: 'u1',
    milestone_type: 'one_rep_max',
    exercise_id: null,
    exercise_name: 'Squat',
    value: 100,
    week_start: null,
    achieved_at: occurredAt,
    created_at: occurredAt,
    exercise: null,
  }
  return {
    kind: 'milestone',
    id,
    userId: 'u1',
    displayName: 'Alex',
    occurredAt,
    milestone,
    ...noReactions,
  }
}

function fakePostEntry(id: string, occurredAt: string): PostFeedEntry {
  const post: Post = {
    id,
    user_id: 'u1',
    storage_path: `u1/${id}.jpg`,
    content: null,
    created_at: occurredAt,
  }
  return {
    kind: 'post',
    id,
    userId: 'u1',
    displayName: 'Alex',
    occurredAt,
    post,
    signedUrl: 'https://example.test/signed',
    ...noReactions,
  }
}

describe('mergeFeedEntries', () => {
  it('interleaves milestones and posts sorted by occurredAt descending', () => {
    const oldest = fakeMilestoneEntry('m1', '2026-01-01T00:00:00Z')
    const middle = fakePostEntry('p1', '2026-01-15T00:00:00Z')
    const newest = fakeMilestoneEntry('m2', '2026-02-01T00:00:00Z')

    const merged = mergeFeedEntries([oldest, newest], [middle])

    expect(merged.map((entry) => entry.id)).toEqual(['m2', 'p1', 'm1'])
  })

  it('returns an empty array when both inputs are empty', () => {
    expect(mergeFeedEntries([], [])).toEqual([])
  })
})
