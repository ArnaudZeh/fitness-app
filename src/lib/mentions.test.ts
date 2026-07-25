import { describe, expect, it } from 'vitest'
import { extractMentions, matchesMentionQuery, uniqueMentionedUserIds } from '@/lib/mentions'
import type { MentionCandidate } from '@/lib/mentions'

const candidates: MentionCandidate[] = [
  { userId: 'u-tanguy', displayName: 'Tanguy' },
  { userId: 'u-gwen', displayName: 'Gwen' },
  { userId: 'u-tom', displayName: 'Tom' },
  { userId: 'u-tom-dupont', displayName: 'Tom Dupont' },
]

describe('extractMentions', () => {
  it('finds a single mention in plain text', () => {
    const matches = extractMentions('Bravo @Tanguy pour ton record !', candidates)
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ userId: 'u-tanguy', displayName: 'Tanguy' })
  })

  it('finds multiple distinct mentions', () => {
    const matches = extractMentions('@Tanguy et @Gwen étaient là', candidates)
    expect(matches.map((m) => m.userId)).toEqual(['u-tanguy', 'u-gwen'])
  })

  it('prefers the longest matching candidate name', () => {
    const matches = extractMentions('@Tom Dupont a explosé son record', candidates)
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ userId: 'u-tom-dupont', displayName: 'Tom Dupont' })
  })

  it('still matches the shorter name when the longer one is absent', () => {
    const matches = extractMentions('@Tom a explosé son record', candidates)
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ userId: 'u-tom' })
  })

  it('is case-insensitive', () => {
    const matches = extractMentions('gg @tanguy', candidates)
    expect(matches).toHaveLength(1)
    expect(matches[0]?.userId).toBe('u-tanguy')
  })

  it('ignores an "@" glued to the previous word (not a mention)', () => {
    const matches = extractMentions('contact: moiTanguy@example.com', candidates)
    expect(matches).toHaveLength(0)
  })

  it('ignores names not in the candidate list', () => {
    const matches = extractMentions('@Inconnu bravo', candidates)
    expect(matches).toHaveLength(0)
  })

  it('returns an empty array for empty text or no candidates', () => {
    expect(extractMentions('', candidates)).toEqual([])
    expect(extractMentions('@Tanguy', [])).toEqual([])
  })
})

describe('uniqueMentionedUserIds', () => {
  it('dedupes when the same person is mentioned twice', () => {
    const matches = extractMentions('@Tanguy encore @Tanguy', candidates)
    expect(uniqueMentionedUserIds(matches)).toEqual(['u-tanguy'])
  })
})

describe('matchesMentionQuery', () => {
  it('matches everyone on an empty query', () => {
    expect(matchesMentionQuery('Tanguy', '')).toBe(true)
  })

  it('matches by first-letter prefix, narrowing as more letters are typed', () => {
    expect(matchesMentionQuery('Tanguy', 'T')).toBe(true)
    expect(matchesMentionQuery('Tom', 'T')).toBe(true)
    expect(matchesMentionQuery('Tanguy', 'To')).toBe(false)
    expect(matchesMentionQuery('Tom', 'To')).toBe(true)
  })

  it('does not match a letter that only appears mid-name', () => {
    expect(matchesMentionQuery('Tanguy', 'ang')).toBe(false)
  })

  it('matches a later word in a multi-word name', () => {
    expect(matchesMentionQuery('Tom Dupont', 'Dup')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(matchesMentionQuery('Tanguy', 't')).toBe(true)
  })
})
