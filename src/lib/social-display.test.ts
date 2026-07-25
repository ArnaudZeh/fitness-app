import { describe, expect, it } from 'vitest'
import { formatMilestoneValue, mergeFeedEntries } from '@/lib/social-display'
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

const noReactions = { likeCount: 0, likedByMe: false, commentCount: 0 }

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
