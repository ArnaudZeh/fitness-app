import { describe, expect, it } from 'vitest'
import {
  buildMeasurementTrend,
  getLoggedMeasurementFields,
} from '@/lib/measurements-display'
import type { BodyMeasurement } from '@/lib/measurements-api'

function makeEntry(overrides: Partial<BodyMeasurement> = {}): BodyMeasurement {
  return {
    id: 'm-1',
    user_id: 'user-1',
    recorded_at: '2026-07-20',
    neck_cm: null,
    chest_cm: null,
    waist_cm: null,
    hips_cm: null,
    arm_cm: null,
    thigh_cm: null,
    calf_cm: null,
    created_at: '2026-07-20T00:00:00Z',
    updated_at: '2026-07-20T00:00:00Z',
    ...overrides,
  }
}

describe('getLoggedMeasurementFields', () => {
  it('returns only fields with at least one logged value, in fixed order', () => {
    const entries = [
      makeEntry({ waist_cm: 82 }),
      makeEntry({ arm_cm: 34 }),
      makeEntry({ waist_cm: null }),
    ]
    expect(getLoggedMeasurementFields(entries)).toEqual(['waist_cm', 'arm_cm'])
  })

  it('returns an empty array when nothing has ever been logged', () => {
    expect(getLoggedMeasurementFields([makeEntry(), makeEntry()])).toEqual([])
  })
})

describe('buildMeasurementTrend', () => {
  it('extracts one field, oldest first, skipping entries where it is null', () => {
    const entries = [
      makeEntry({ recorded_at: '2026-07-20', waist_cm: 80 }),
      makeEntry({ recorded_at: '2026-07-10', waist_cm: null }),
      makeEntry({ recorded_at: '2026-07-01', waist_cm: 82 }),
    ]
    expect(buildMeasurementTrend(entries, 'waist_cm')).toEqual([
      { date: '2026-07-01', valueCm: 82 },
      { date: '2026-07-20', valueCm: 80 },
    ])
  })

  it('returns an empty array when the field was never logged', () => {
    const entries = [makeEntry({ recorded_at: '2026-07-20' })]
    expect(buildMeasurementTrend(entries, 'hips_cm')).toEqual([])
  })
})
