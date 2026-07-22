// Epley and Brzycki estimated-1RM formulas — both are approximations that
// only hold up in the low-to-moderate rep range; beyond ~12 reps they
// diverge significantly from reality, so callers should only feed them
// sets with reps in [1, 12].
export function estimateOneRepMaxEpley(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30)
}

export function estimateOneRepMaxBrzycki(weightKg: number, reps: number): number {
  return (weightKg * 36) / (37 - reps)
}

export const MAX_RELIABLE_REPS_FOR_1RM = 12

export interface OneRepMaxEstimate {
  epleyKg: number
  brzyckiKg: number
  averageKg: number
}

// null when reps are outside the range where these formulas are reliable
// (or non-positive), rather than returning a misleading number.
export function estimateOneRepMax(
  weightKg: number,
  reps: number,
): OneRepMaxEstimate | null {
  if (reps < 1 || reps > MAX_RELIABLE_REPS_FOR_1RM || weightKg <= 0) return null
  const epleyKg = estimateOneRepMaxEpley(weightKg, reps)
  const brzyckiKg = estimateOneRepMaxBrzycki(weightKg, reps)
  return { epleyKg, brzyckiKg, averageKg: (epleyKg + brzyckiKg) / 2 }
}
