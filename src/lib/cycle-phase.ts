export type CyclePhase = 'menstruelle' | 'folliculaire' | 'ovulation' | 'luteale'

export interface CyclePhaseResult {
  phase: CyclePhase
  cycleDay: number
  cycleLengthDays: number
}

export const CYCLE_PHASE_LABELS: Record<CyclePhase, string> = {
  menstruelle: 'Menstruelle',
  folliculaire: 'Folliculaire',
  ovulation: 'Ovulation',
  luteale: 'Lutéale',
}

const DEFAULT_CYCLE_LENGTH_DAYS = 28
const MENSTRUAL_PHASE_DAYS = 5
// Approximation standard : la phase lutéale dure ~14 jours quelle que soit
// la longueur totale du cycle — l'ovulation se déduit donc en reculant de
// 14 jours depuis la fin du cycle estimée, pas d'une position fixe.
const LUTEAL_PHASE_DAYS = 14

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

// Average gap between consecutive period starts, from the most recent
// entries — falls back to the standard 28-day estimate with fewer than two
// entries to compute a real gap from.
export function estimateCycleLengthDays(sortedStartDates: string[]): number {
  if (sortedStartDates.length < 2) return DEFAULT_CYCLE_LENGTH_DAYS
  const gaps: number[] = []
  for (let i = 1; i < sortedStartDates.length; i++) {
    const previous = sortedStartDates[i - 1]
    const current = sortedStartDates[i]
    if (previous === undefined || current === undefined) continue
    gaps.push(daysBetween(previous, current))
  }
  if (gaps.length === 0) return DEFAULT_CYCLE_LENGTH_DAYS
  const average = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
  return Math.round(average)
}

// sortedStartDates must be ascending (oldest first). Returns null with no
// entries at all — there's nothing to compute a phase from yet.
export function computeCyclePhase(
  sortedStartDates: string[],
  today: string,
): CyclePhaseResult | null {
  if (sortedStartDates.length === 0) return null
  const lastStart = sortedStartDates[sortedStartDates.length - 1]
  if (lastStart === undefined) return null

  const cycleLengthDays = estimateCycleLengthDays(sortedStartDates)
  const daysSinceStart = daysBetween(lastStart, today)
  // A cycle "day" is 1-indexed (the start date itself is day 1) and wraps
  // past the estimated length if no new entry has been logged yet — still
  // shows a best-guess phase rather than nothing.
  const cycleDay = (daysSinceStart % cycleLengthDays) + 1

  const ovulationDay = Math.max(cycleLengthDays - LUTEAL_PHASE_DAYS, MENSTRUAL_PHASE_DAYS + 1)

  let phase: CyclePhase
  if (cycleDay <= MENSTRUAL_PHASE_DAYS) {
    phase = 'menstruelle'
  } else if (cycleDay < ovulationDay - 1) {
    phase = 'folliculaire'
  } else if (cycleDay <= ovulationDay + 1) {
    phase = 'ovulation'
  } else {
    phase = 'luteale'
  }

  return { phase, cycleDay, cycleLengthDays }
}
