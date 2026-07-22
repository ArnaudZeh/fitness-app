export interface ParsedSetInput {
  weightKg: number | null
  reps: number | null
  rpe: number | null
}

// Best-effort parser, not full NLP — relies on the speech engine already
// transcribing spoken numbers as digits (what Chrome/Android's recognizer
// does in practice), plus nearby keywords to disambiguate charge vs reps vs
// RPE. Falls back to "first number = charge, second = reps" when no
// keywords are said, since that's the natural order out loud ("quatre-vingts,
// huit" for "80kg for 8 reps").
export function parseVoiceSetInput(transcript: string): ParsedSetInput {
  const normalized = transcript.toLowerCase().replaceAll(',', '.')

  const weightMatch = /(\d+(?:\.\d+)?)\s*(?:kg|kilos?)/.exec(normalized)
  const repsMatch = /(\d+(?:\.\d+)?)\s*(?:reps?|répétitions?)/.exec(normalized)
  const rpeMatch = /rpe\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*rpe/.exec(normalized)

  let weightKg = weightMatch ? Number(weightMatch[1]) : null
  let reps = repsMatch ? Number(repsMatch[1]) : null
  const rpe = rpeMatch ? Number(rpeMatch[1] ?? rpeMatch[2]) : null

  if (weightKg === null && reps === null) {
    const bareNumbers = [...normalized.matchAll(/\d+(?:\.\d+)?/g)].map((match) =>
      Number(match[0]),
    )
    weightKg = bareNumbers[0] ?? null
    reps = bareNumbers[1] ?? null
  }

  return { weightKg, reps, rpe }
}
