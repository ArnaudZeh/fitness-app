export interface MentionCandidate {
  userId: string
  displayName: string
}

export interface MentionMatch extends MentionCandidate {
  start: number
  end: number
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Longest display name first, so "@Tom Dupont" isn't matched as just
// "@Tom" when both happen to be candidates for the same text.
export function extractMentions(text: string, candidates: MentionCandidate[]): MentionMatch[] {
  if (candidates.length === 0 || text === '') return []
  const sorted = [...candidates].sort((a, b) => b.displayName.length - a.displayName.length)
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])@(${sorted.map((c) => escapeRegExp(c.displayName)).join('|')})(?![\\p{L}\\p{N}])`,
    'giu',
  )
  const matches: MentionMatch[] = []
  for (const match of text.matchAll(pattern)) {
    const matchedName = match[1]
    if (match.index === undefined || matchedName === undefined) continue
    const candidate = sorted.find((c) => c.displayName.toLowerCase() === matchedName.toLowerCase())
    if (!candidate) continue
    matches.push({ ...candidate, start: match.index, end: match.index + match[0].length })
  }
  return matches
}

// One notification per mentioned friend even if their name appears more
// than once in the same post/comment.
export function uniqueMentionedUserIds(matches: MentionMatch[]): string[] {
  return [...new Set(matches.map((m) => m.userId))]
}

// Prefix match against each word of the display name, not a substring
// search — typing "@t" should surface "Tanguy"/"Tom" the way a first-letter
// filter would, and "@dup" should still find "Tom Dupont" via the second
// word. An empty query (bare "@") matches everyone.
export function matchesMentionQuery(displayName: string, query: string): boolean {
  if (query.trim() === '') return true
  const lowerQuery = query.trim().toLowerCase()
  return displayName
    .toLowerCase()
    .split(/\s+/)
    .some((word) => word.startsWith(lowerQuery))
}
