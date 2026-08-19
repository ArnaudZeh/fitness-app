import { describe, expect, it } from 'vitest'
import { buildUserProfileContext, computeAge } from '@/lib/user-context'
import type { Profile } from '@/lib/profile-api'
import type { CoachingProfile } from '@/lib/coaching-profile-api'

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
    is_public: false,
    timezone: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function fakeCoachingProfile(overrides: Partial<CoachingProfile> = {}): CoachingProfile {
  const base: Record<string, null> = {}
  for (const key of [
    'secondary_goals',
    'goal_horizon',
    'target_event',
    'motivation_why',
    'past_attempts',
    'success_definition',
    'diagnosed_conditions',
    'current_medications',
    'past_surgeries',
    'family_medical_history',
    'medical_followup',
    'last_checkup_date',
    'pregnancy_status',
    'medical_clearance',
    'current_injuries',
    'chronic_injuries',
    'recurring_pain',
    'contraindicated_movements',
    'physio_osteo_followup',
    'fitness_level',
    'years_training',
    'current_sports',
    'past_sports',
    'competitive_background',
    'key_lift_prs',
    'favorite_exercises',
    'disliked_exercises',
    'body_focus_preference',
    'prior_coaching_experience',
    'diet_type',
    'meals_per_day',
    'snacking_habits',
    'cooking_habits',
    'food_budget_monthly',
    'favorite_foods',
    'disliked_foods',
    'food_allergies',
    'food_intolerances',
    'daily_water_intake_l',
    'eating_disorder_history',
    'macro_tracking_experience',
    'estimated_daily_calories',
    'current_supplements',
    'past_supplements',
    'supplement_budget_monthly',
    'supplement_preferences',
    'supplement_reluctances',
    'avg_sleep_hours',
    'sleep_quality',
    'bedtime',
    'wake_time',
    'sleep_disorders',
    'screens_before_bed',
    'stress_level',
    'stress_sources',
    'occupation_type',
    'daily_sitting_hours',
    'avg_daily_steps',
    'family_context',
    'travel_frequency',
    'smoking_status',
    'alcohol_consumption',
    'caffeine_intake',
    'training_location',
    'home_equipment',
    'gym_access_details',
    'available_days_times',
    'session_duration_preference_min',
    'training_alone_or_group',
    'travel_constraints',
    'contraception_method',
    'menopause_status',
    'past_dropout_reasons',
    'adherence_motivators',
    'structure_preference',
    'discomfort_tolerance',
    'scale_relationship',
    'communication_style_preference',
    'wearable_device',
    'tracking_apps_used',
    'wants_data_sync',
  ]) {
    base[key] = null
  }
  return {
    id: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...base,
    ...overrides,
  } as CoachingProfile
}

const emptyNutritionContext = { targets: null, today: null, last7Days: null }

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
      null,
      null,
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
      coaching: null,
      nutrition: emptyNutritionContext,
    })
  })

  it('leaves fields null when the profile has nothing filled in', () => {
    const context = buildUserProfileContext(fakeProfile(), [], [], null, null, [], now)
    expect(context).toEqual({
      sex: null,
      ageYears: null,
      heightCm: null,
      goal: null,
      targetWeightKg: null,
      currentWeightKg: null,
      cyclePhase: null,
      coaching: null,
      nutrition: emptyNutritionContext,
    })
  })

  it('includes the cycle phase when the module is enabled and entries exist', () => {
    const profile = fakeProfile({ cycle_module_enabled: true })
    const context = buildUserProfileContext(
      profile,
      [],
      [{ start_date: '2026-07-01' }],
      null,
      null,
      [],
      now, // 2026-07-23 → cycle day 23
    )
    expect(context.cyclePhase).toEqual({ phase: 'luteale', cycleDay: 23 })
  })

  it('omits the cycle phase when the module is disabled, even with entries', () => {
    const profile = fakeProfile({ cycle_module_enabled: false })
    const context = buildUserProfileContext(
      profile,
      [],
      [{ start_date: '2026-07-01' }],
      null,
      null,
      [],
      now,
    )
    expect(context.cyclePhase).toBeNull()
  })

  it('omits the cycle phase when the module is enabled but no entries exist', () => {
    const profile = fakeProfile({ cycle_module_enabled: true })
    const context = buildUserProfileContext(profile, [], [], null, null, [], now)
    expect(context.cyclePhase).toBeNull()
  })

  it('includes the coaching profile, stripped of row metadata', () => {
    const coachingProfile = fakeCoachingProfile({
      current_injuries: 'Épaule droite sensible',
      diet_type: 'vegetarien',
    })
    const context = buildUserProfileContext(
      fakeProfile(),
      [],
      [],
      coachingProfile,
      null,
      [],
      now,
    )
    expect(context.coaching).not.toBeNull()
    expect(context.coaching?.current_injuries).toBe('Épaule droite sensible')
    expect(context.coaching?.diet_type).toBe('vegetarien')
    expect(context.coaching).not.toHaveProperty('id')
    expect(context.coaching).not.toHaveProperty('created_at')
    expect(context.coaching).not.toHaveProperty('updated_at')
  })

  it('leaves the coaching context null when no coaching profile is passed', () => {
    const context = buildUserProfileContext(fakeProfile(), [], [], null, null, [], now)
    expect(context.coaching).toBeNull()
  })

  it('includes the nutrition context (targets + today + last7Days)', () => {
    const targets = {
      activity_level: 'physique' as const,
      calories_target: 2800,
      protein_g_target: 190,
      carbs_g_target: 300,
      fat_g_target: 80,
    }
    const context = buildUserProfileContext(
      fakeProfile(),
      [],
      [],
      null,
      targets,
      [{ logged_date: '2026-07-23', calories: 500, protein_g: 40, carbs_g: 50, fat_g: 15 }],
      now,
    )
    expect(context.nutrition.targets).toEqual({
      activityLevel: 'physique',
      caloriesTarget: 2800,
      proteinGTarget: 190,
      carbsGTarget: 300,
      fatGTarget: 80,
    })
    expect(context.nutrition.today).toEqual({
      caloriesConsumed: 500,
      proteinGConsumed: 40,
      carbsGConsumed: 50,
      fatGConsumed: 15,
    })
  })
})
