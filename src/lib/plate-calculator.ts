// Standard bumper/iron plate set found in most gyms (kg). Not user-configurable
// yet — a reasonable default for a first pass, see TODOS.md.
export const STANDARD_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25]

export const DEFAULT_BAR_WEIGHT_KG = 20

export interface PlateGroup {
  plateKg: number
  count: number
}

export interface PlateBreakdown {
  barWeightKg: number
  perSide: PlateGroup[]
  achievedWeightKg: number
  isExact: boolean
}

// Greedy largest-plate-first per side. This is optimal (not just a decent
// heuristic) for a standard gym plate set — each denomination divides evenly
// into the ones above it, the same property that makes greedy correct for
// everyday coin systems. Floating-point epsilon guards against e.g.
// 2.5 - 2.5 leaving a phantom 1e-15 remainder.
export function calculatePlateBreakdown(
  targetWeightKg: number,
  barWeightKg: number = DEFAULT_BAR_WEIGHT_KG,
  availablePlatesKg: number[] = STANDARD_PLATES_KG,
): PlateBreakdown {
  const perSideTarget = (targetWeightKg - barWeightKg) / 2

  if (perSideTarget <= 1e-9) {
    return {
      barWeightKg,
      perSide: [],
      achievedWeightKg: barWeightKg,
      isExact: Math.abs(targetWeightKg - barWeightKg) < 1e-9,
    }
  }

  const sortedPlates = [...availablePlatesKg].sort((a, b) => b - a)
  let remaining = perSideTarget
  const perSide: PlateGroup[] = []

  for (const plate of sortedPlates) {
    let count = 0
    while (remaining - plate >= -1e-9) {
      remaining -= plate
      count++
    }
    if (count > 0) perSide.push({ plateKg: plate, count })
  }

  const achievedPerSide = perSideTarget - remaining
  return {
    barWeightKg,
    perSide,
    achievedWeightKg: barWeightKg + achievedPerSide * 2,
    isExact: Math.abs(remaining) < 1e-9,
  }
}
