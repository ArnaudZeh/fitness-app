import { describe, expect, it } from 'vitest'
import { buildUserProfileContext, computeAge } from '@/lib/user-context'
import type { Profile } from '@/lib/profile-api'

describe('computeAge', () => {
  it('counts a full year once the birthday has passed this year', () => {
    const now = new Date('2026-07-23T12:00:00Z')
    expect(computeAge('2000-07-23', now)).toBe(26) // birthday is today
    expect(computeAge('2000-06-01', now)).toBe(26) // birthday already passed
  })

  it('does not count the year until the birthday actually arrives', () => {
    const now = new Date('2026-07-23T12:00:00Z')
    expect(computeAge('2000-12-30', now)).toBe(25)
  })
})

function fakeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    display_name: null,
    avatar_path: null,
    date_of_birth: null,
    sex: null,
    height_cm: null,
    goal: null,
    target_weight_kg: null,
    cycle_module_enabled: false,
    social_sharing_enabled: false,
    timezone: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('buildUserProfileContext', () => {
  const now = new Date('2026-07-23T12:00:00Z')

  it('combines profile fields with the most recent weight entry', () => {
    const profile = fakeProfile({
      sex: 'homme',
      date_of_birth: '1995-03-10',
      height_cm: 180,
      goal: 'prise_de_muscle',
      target_weight_kg: 85,
    })
    const context = buildUserProfileContext(
      profile,
      [{ weight_kg: 78.5 }, { weight_kg: 78.2 }],
      [],
      now,
    )
    expect(context).toEqual({
      sex: 'homme',
      ageYears: 31,
      heightCm: 180,
      goal: 'prise_de_muscle',
      targetWeightKg: 85,
      currentWeightKg: 78.5,
      cyclePhase: null,
    })
  })

  it('leaves fields null when the profile has nothing filled in', () => {
    const context = buildUserProfileContext(fakeProfile(), [], [], now)
    expect(context).toEqual({
      sex: null,
      ageYears: null,
      heightCm: null,
      goal: null,
      targetWeightKg: null,
      currentWeightKg: null,
      cyclePhase: null,
    })
  })

  it('includes the cycle phase when the module is enabled and entries exist', () => {
    const profile = fakeProfile({ cycle_module_enabled: true })
    const context = buildUserProfileContext(
      profile,
      [],
      [{ start_date: '2026-07-01' }],
      now, // 2026-07-23 → cycle day 23
    )
    expect(context.cyclePhase).toEqual({ phase: 'luteale', cycleDay: 23 })
  })

  it('omits the cycle phase when the module is disabled, even with entries', () => {
    const profile = fakeProfile({ cycle_module_enabled: false })
    const context = buildUserProfileContext(profile, [], [{ start_date: '2026-07-01' }], now)
    expect(context.cyclePhase).toBeNull()
  })

  it('omits the cycle phase when the module is enabled but no entries exist', () => {
    const profile = fakeProfile({ cycle_module_enabled: true })
    const context = buildUserProfileContext(profile, [], [], now)
    expect(context.cyclePhase).toBeNull()
  })
})
