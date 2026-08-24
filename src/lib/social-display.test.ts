import { describe, expect, it } from 'vitest'
import {
  computePopularityScore,
  formatMilestoneValue,
  mergeFeedEntries,
  sortFeedByPopularity,
} from '@/lib/social-display'
import type { MilestoneFeedEntry, MilestoneWithImage, Post, PostFeedEntry } from '@/lib/social-display'

describe('formatMilestoneValue', () => {
  it('shows one_rep_max in kg', () => {
    expect(formatMilestoneValue({ milestone_type: 'one_rep_max', value: 126.04 })).toBe(
      '126.04 kg',
    )
  })

  it('shows weight_goal in kg', () => {
    expect(formatMilestoneValue({ milestone_type: 'weight_goal', value: 70 })).toBe('70 kg')
  })
})

const noReactions = { likeCount: 0, likedByMe: false, commentCount: 0, likedBy: [] }

function fakeMilestoneEntry(id: string, occurredAt: string): MilestoneFeedEntry {
  const milestone: MilestoneWithImage = {
    id,
    user_id: 'u1',
    milestone_type: 'one_rep_max',
    exercise_id: null,
    exercise_name: 'Squat',
    value: 100,
    achieved_at: occurredAt,
    created_at: occurredAt,
    exercise: null,
  }
  return {
    kind: 'milestone',
    id,
    userId: 'u1',
    displayName: 'Alex',
    avatarUrl: null,
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
    avatarUrl: null,
    occurredAt,
    post,
    signedUrl: 'https://example.test/signed',
    mentions: [],
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

describe('computePopularityScore', () => {
  const now = new Date('2026-01-10T00:00:00Z')

  it('is 0 for an entry with no engagement, regardless of age', () => {
    const entry = { likeCount: 0, commentCount: 0, occurredAt: '2026-01-01T00:00:00Z' }
    expect(computePopularityScore(entry, now)).toBe(0)
  })

  it('scores a fresh, lightly-liked entry higher than an old, heavily-liked one', () => {
    const fresh = { likeCount: 3, commentCount: 0, occurredAt: '2026-01-09T23:00:00Z' } // 1h old
    const old = { likeCount: 20, commentCount: 0, occurredAt: '2025-12-01T00:00:00Z' } // ~40 days old
    expect(computePopularityScore(fresh, now)).toBeGreaterThan(computePopularityScore(old, now))
  })

  it('never divides by ~0 for an entry that just happened', () => {
    const entry = { likeCount: 5, commentCount: 0, occurredAt: now.toISOString() }
    expect(Number.isFinite(computePopularityScore(entry, now))).toBe(true)
  })
})

describe('sortFeedByPopularity', () => {
  it('reorders entries by freshness-weighted engagement, not just recency', () => {
    const now = new Date('2026-01-10T00:00:00Z')
    const newestNoEngagement = {
      ...fakePostEntry('p-newest', '2026-01-09T23:30:00Z'),
      likeCount: 0,
      commentCount: 0,
    }
    const olderPopular = {
      ...fakeMilestoneEntry('m-popular', '2026-01-08T00:00:00Z'),
      likeCount: 10,
      commentCount: 2,
    }

    const sorted = sortFeedByPopularity([newestNoEngagement, olderPopular], now)

    expect(sorted.map((entry) => entry.id)).toEqual(['m-popular', 'p-newest'])
  })

  it('does not mutate the input array', () => {
    const now = new Date('2026-01-10T00:00:00Z')
    const a = { ...fakePostEntry('p1', '2026-01-01T00:00:00Z'), likeCount: 1, commentCount: 0 }
    const b = { ...fakePostEntry('p2', '2026-01-09T00:00:00Z'), likeCount: 5, commentCount: 0 }
    const original = [a, b]
    sortFeedByPopularity(original, now)
    expect(original).toEqual([a, b])
  })
})
