import { describe, expect, it } from 'vitest'
import { buildHeatmapDays } from '@/components/ContributionHeatmap'

// Built from local Date constructors (not UTC 'Z' strings) so these tests
// stay correct regardless of which timezone they run in — buildHeatmapDays
// walks local calendar days (see its own comment for why).
describe('buildHeatmapDays', () => {
  it('renders the current week first (left) and older weeks after (right), each Monday-to-Sunday', () => {
    // 2026-07-22 is a Wednesday, so the current week is 2026-07-20 (Mon) to 07-26 (Sun).
    const now = new Date(2026, 6, 22, 12, 0, 0)
    const days = buildHeatmapDays(new Map(), 2, now)

    expect(days[0]?.date).toBe('2026-07-20') // current week's Monday, first/leftmost
    expect(days[6]?.date).toBe('2026-07-26') // current week's Sunday
    expect(days[7]?.date).toBe('2026-07-13') // older week's Monday follows
    expect(days.at(-1)?.date).toBe('2026-07-19') // older week's Sunday, last/rightmost
    expect(days).toHaveLength(14)
  })

  it('produces exactly weeksToShow * 7 days', () => {
    const days = buildHeatmapDays(new Map(), 53, new Date(2026, 6, 22, 12, 0, 0))
    expect(days).toHaveLength(53 * 7)
  })

  it('assigns level 0 to days with no logged volume and no completed session', () => {
    const days = buildHeatmapDays(new Map(), 1, new Date(2026, 6, 22, 12, 0, 0))
    expect(days.every((day) => day.level === 0)).toBe(true)
  })

  it('assigns the highest level to the day with the most volume', () => {
    const dailyVolumeKg = new Map([
      ['2026-07-20', 100],
      ['2026-07-21', 1000],
    ])
    const days = buildHeatmapDays(dailyVolumeKg, 1, new Date(2026, 6, 22, 12, 0, 0))
    const day20 = days.find((day) => day.date === '2026-07-20')
    const day21 = days.find((day) => day.date === '2026-07-21')
    expect(day21?.level).toBe(3)
    expect(day20?.level).toBeGreaterThan(0)
    expect(day20?.level).toBeLessThan(3)
  })

  it('is Sunday-aware when "today" itself is a Sunday', () => {
    // 2026-07-26 is a Sunday — the grid should end that same day.
    const now = new Date(2026, 6, 26, 12, 0, 0)
    const days = buildHeatmapDays(new Map(), 1, now)
    expect(days.at(-1)?.date).toBe('2026-07-26')
    expect(days[0]?.date).toBe('2026-07-20')
  })

  it('gives a completed-but-dataless day the lowest active level instead of level 0', () => {
    const now = new Date(2026, 6, 22, 12, 0, 0)
    const activeDates = new Set(['2026-07-20'])
    const days = buildHeatmapDays(new Map(), 1, now, activeDates)
    const day20 = days.find((day) => day.date === '2026-07-20')
    expect(day20?.level).toBe(1)
    expect(day20?.volumeKg).toBe(0)
  })

  it('lets real logged volume take priority over the activeDates floor', () => {
    const now = new Date(2026, 6, 22, 12, 0, 0)
    // 700/1000 = 0.7 ratio → level 3, well above the level-1 floor
    // activeDates alone would give — proves volume-based tiering wins.
    const dailyVolumeKg = new Map([
      ['2026-07-20', 700],
      ['2026-07-21', 1000],
    ])
    const activeDates = new Set(['2026-07-20'])
    const days = buildHeatmapDays(dailyVolumeKg, 1, now, activeDates)
    const day20 = days.find((day) => day.date === '2026-07-20')
    expect(day20?.level).toBe(3)
  })
})
