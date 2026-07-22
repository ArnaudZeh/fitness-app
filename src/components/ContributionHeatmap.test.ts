import { describe, expect, it } from 'vitest'
import { buildHeatmapDays } from '@/components/ContributionHeatmap'

describe('buildHeatmapDays', () => {
  it('starts the grid on a Monday and ends on the Sunday of the current week', () => {
    // 2026-07-22 is a Wednesday.
    const now = new Date('2026-07-22T12:00:00Z')
    const days = buildHeatmapDays(new Map(), 2, now)

    expect(days[0]?.date).toBe('2026-07-13') // Monday, one full week back
    expect(days.at(-1)?.date).toBe('2026-07-26') // Sunday closing the current week
    expect(days).toHaveLength(14)
  })

  it('produces exactly weeksToShow * 7 days', () => {
    const days = buildHeatmapDays(new Map(), 53, new Date('2026-07-22T12:00:00Z'))
    expect(days).toHaveLength(53 * 7)
  })

  it('assigns level 0 to days with no logged volume', () => {
    const days = buildHeatmapDays(new Map(), 1, new Date('2026-07-22T12:00:00Z'))
    expect(days.every((day) => day.level === 0)).toBe(true)
  })

  it('assigns the highest level to the day with the most volume', () => {
    const dailyVolumeKg = new Map([
      ['2026-07-20', 100],
      ['2026-07-21', 1000],
    ])
    const days = buildHeatmapDays(dailyVolumeKg, 1, new Date('2026-07-22T12:00:00Z'))
    const day20 = days.find((day) => day.date === '2026-07-20')
    const day21 = days.find((day) => day.date === '2026-07-21')
    expect(day21?.level).toBe(3)
    expect(day20?.level).toBeGreaterThan(0)
    expect(day20?.level).toBeLessThan(3)
  })

  it('is Sunday-aware when "today" itself is a Sunday', () => {
    // 2026-07-26 is a Sunday — the grid should end that same day.
    const now = new Date('2026-07-26T12:00:00Z')
    const days = buildHeatmapDays(new Map(), 1, now)
    expect(days.at(-1)?.date).toBe('2026-07-26')
    expect(days[0]?.date).toBe('2026-07-20')
  })
})
