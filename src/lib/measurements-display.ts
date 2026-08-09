import type { BodyMeasurement } from '@/lib/measurements-api'

export type MeasurementField =
  'neck_cm' | 'chest_cm' | 'waist_cm' | 'hips_cm' | 'arm_cm' | 'thigh_cm' | 'calf_cm'

// Same order as the logging form on ProfilePage — kept consistent rather
// than reordered by assumed popularity.
export const MEASUREMENT_FIELD_ORDER: MeasurementField[] = [
  'neck_cm',
  'chest_cm',
  'waist_cm',
  'hips_cm',
  'arm_cm',
  'thigh_cm',
  'calf_cm',
]

export const MEASUREMENT_FIELD_LABELS: Record<MeasurementField, string> = {
  neck_cm: 'Cou',
  chest_cm: 'Poitrine',
  waist_cm: 'Taille',
  hips_cm: 'Hanches',
  arm_cm: 'Bras',
  thigh_cm: 'Cuisse',
  calf_cm: 'Mollet',
}

export interface MeasurementTrendPoint {
  date: string
  valueCm: number
}

// Fields that have at least one logged value, in the same fixed display
// order — no point offering a field with nothing to chart.
export function getLoggedMeasurementFields(
  entries: BodyMeasurement[],
): MeasurementField[] {
  return MEASUREMENT_FIELD_ORDER.filter((field) =>
    entries.some((entry) => entry[field] !== null),
  )
}

// entries is expected sorted most-recent-first (fetchMeasurements already
// orders this way) — reversed here since a chart reads left-to-right
// chronologically, the opposite of the list display's newest-first order.
export function buildMeasurementTrend(
  entries: BodyMeasurement[],
  field: MeasurementField,
): MeasurementTrendPoint[] {
  return entries
    .filter((entry) => entry[field] !== null)
    .map((entry) => ({ date: entry.recorded_at, valueCm: entry[field] as number }))
    .reverse()
}
