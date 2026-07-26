import type { SetSide } from '@/lib/session-logs-api'

export const SIDE_LABELS: Record<SetSide, string> = { left: 'Gauche', right: 'Droite', both: '' }

// Side of an unread-yet-completed pair to fill in next: the first
// set_number missing a side, or a brand-new set_number (starting left)
// once every existing one has both sides logged. Bilateral exercises just
// keep counting sets — side stays 'both' throughout.
export function computeNextTarget(
  sets: { set_number: number; side: SetSide }[],
  isUnilateral: boolean,
): { setNumber: number; side: SetSide } {
  if (!isUnilateral) return { setNumber: sets.length + 1, side: 'both' }

  const sidesBySetNumber = new Map<number, Set<SetSide>>()
  for (const set of sets) {
    const sides = sidesBySetNumber.get(set.set_number) ?? new Set<SetSide>()
    sides.add(set.side)
    sidesBySetNumber.set(set.set_number, sides)
  }
  const setNumbers = [...sidesBySetNumber.keys()].sort((a, b) => a - b)
  for (const setNumber of setNumbers) {
    const sides = sidesBySetNumber.get(setNumber)
    if (!sides?.has('left')) return { setNumber, side: 'left' }
    if (!sides.has('right')) return { setNumber, side: 'right' }
  }
  return { setNumber: setNumbers.length > 0 ? Math.max(...setNumbers) + 1 : 1, side: 'left' }
}
