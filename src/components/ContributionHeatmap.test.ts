import { describe, expect, it } from 'vitest'
import { buildHeatmapDays } from '@/components/ContributionHeatmap'

// Built from local Date constructors (not UTC 'Z' strings) so these tests
// stay correct regardless of which timezone they run in — buildHeatmapDays
// walks local calendar days (see its own comment for why).
describe('buildHeatmapDays', () => {
  it('renders the oldest week first (left) and the current week last (right), each Monday-to-Sunday', () => {
    // 2026-07-22 is a Wednesday, so the current week is 2026-07-20 (Mon) to 07-26 (Sun).
    const now = new Date(2026, 6, 22, 12, 0, 0)
    const days = buildHeatmapDays(new Map(), 2, now)

    expect(days[0]?.date).toBe('2026-07-13') // older week's Monday, first/leftmost
    expect(days[6]?.date).toBe('2026-07-19') // older week's Sunday
    expect(days[7]?.date).toBe('2026-07-20') // current week's Monday follows
    expect(days.at(-1)?.date).toBe('2026-07-26') // current week's Sunday, last/rightmost
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

  it('trims leading empty weeks and pads the freed columns back in as future weeks on the right, a brand-new account', () => {
    // 2026-07-22 is a Wednesday; only the current week (07-20 to 07-26) has
    // any activity, so the 3 older empty weeks get cut from the front and
    // 3 future (not-yet-happened) weeks are appended after gridEnd instead,
    // keeping the grid at weeksToShow columns without moving the active week.
    const now = new Date(2026, 6, 22, 12, 0, 0)
    const dailyVolumeKg = new Map([['2026-07-21', 100]])
    const days = buildHeatmapDays(dailyVolumeKg, 4, now)
    expect(days).toHaveLength(28) // still weeksToShow * 7
    expect(days[0]?.date).toBe('2026-07-20') // active week untouched, still leftmost
    expect(days[6]?.date).toBe('2026-07-26')
    expect(days[7]?.date).toBe('2026-07-27') // future padding starts right after gridEnd
    expect(days.at(-1)?.date).toBe('2026-08-16')
    expect(days.slice(7).every((day) => day.level === 0)).toBe(true)
  })

  it('does not trim past the first active week, keeping earlier gaps visible', () => {
    // Active in week 2 (of 4), so week 1 (empty) gets trimmed but weeks
    // 2-4 stay intact even though week 3 is itself empty — trimming only
    // cuts the dead space before the first activity, not gaps after it.
    // The one freed leading week comes back as one future week on the right.
    const now = new Date(2026, 6, 22, 12, 0, 0)
    const dailyVolumeKg = new Map([['2026-07-06', 100]]) // Monday of week 2
    const days = buildHeatmapDays(dailyVolumeKg, 4, now)
    expect(days).toHaveLength(28)
    expect(days[0]?.date).toBe('2026-07-06')
    expect(days.at(-1)?.date).toBe('2026-08-02') // 1 future week appended after 07-26
  })

  it('does not trim or pad when the entire window is empty', () => {
    const days = buildHeatmapDays(new Map(), 3, new Date(2026, 6, 22, 12, 0, 0))
    expect(days).toHaveLength(21)
  })

  it('does not pad when the account already has activity spanning the full window', () => {
    const now = new Date(2026, 6, 22, 12, 0, 0)
    const dailyVolumeKg = new Map([['2026-07-13', 50]]) // in the oldest of 2 weeks
    const days = buildHeatmapDays(dailyVolumeKg, 2, now)
    expect(days).toHaveLength(14)
    expect(days.at(-1)?.date).toBe('2026-07-26')
  })
})
