import { describe, expect, it } from 'vitest'
import { formatMilestoneValue } from '@/lib/social-display'

describe('formatMilestoneValue', () => {
  it('shows one_rep_max with decimal precision', () => {
    expect(formatMilestoneValue({ milestone_type: 'one_rep_max', value: 126.04 })).toBe(
      '126.04 kg',
    )
  })

  it('rounds weekly_tonnage to a whole number', () => {
    expect(formatMilestoneValue({ milestone_type: 'weekly_tonnage', value: 899.6 })).toBe(
      '900 kg cette semaine-là',
    )
  })

  it('pluralizes regularity_streak correctly', () => {
    expect(formatMilestoneValue({ milestone_type: 'regularity_streak', value: 1 })).toBe(
      "1 semaine d'affilée",
    )
    expect(formatMilestoneValue({ milestone_type: 'regularity_streak', value: 4 })).toBe(
      "4 semaines d'affilée",
    )
  })
})
