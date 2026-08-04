import { toLocalDateString } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface ContributionHeatmapProps {
  dailyVolumeKg: Map<string, number>
  // Local dates with a completed session but possibly no logged sets (see
  // getCompletedSessionDates) — rendered as the lowest active tier even at
  // 0 kg, so a séance réalisée without data entry still reads as activity
  // rather than looking identical to a rest day.
  activeDates?: Set<string>
  weeksToShow?: number
}

interface HeatmapDay {
  date: string
  volumeKg: number
  level: 0 | 1 | 2 | 3
}

export function buildHeatmapDays(
  dailyVolumeKg: Map<string, number>,
  weeksToShow: number,
  now: Date = new Date(),
  activeDates: Set<string> = new Set(),
): HeatmapDay[] {
  // Local-date math throughout: dailyVolumeKg's keys are already local
  // calendar dates (see fetchSetHistory), so the grid must walk local days
  // too, or a session logged in the evening west of UTC would land one
  // column off from where it's keyed.
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const todayIsoDayOfWeek = today.getDay() === 0 ? 7 : today.getDay()
  const gridEnd = new Date(today)
  gridEnd.setDate(today.getDate() + (7 - todayIsoDayOfWeek))

  // gridEnd is always a Sunday, so stepping back a whole number of weeks
  // and one more day lands exactly on a Monday — every column is a full
  // calendar week, no separate alignment step needed.
  const gridStart = new Date(gridEnd)
  gridStart.setDate(gridEnd.getDate() - weeksToShow * 7 + 1)

  const maxVolume = Math.max(0, ...dailyVolumeKg.values())
  const days: HeatmapDay[] = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    const date = toLocalDateString(cursor.toISOString())
    const volumeKg = dailyVolumeKg.get(date) ?? 0
    let level: HeatmapDay['level'] = 0
    if (volumeKg > 0 && maxVolume > 0) {
      const ratio = volumeKg / maxVolume
      level = ratio <= 1 / 3 ? 1 : ratio <= 2 / 3 ? 2 : 3
    } else if (activeDates.has(date)) {
      level = 1
    }
    days.push({ date, volumeKg, level })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

const LEVEL_CLASS: Record<HeatmapDay['level'], string> = {
  0: 'bg-muted',
  1: 'bg-primary/30',
  2: 'bg-primary/60',
  3: 'bg-primary',
}

export function ContributionHeatmap({
  dailyVolumeKg,
  activeDates = new Set(),
  weeksToShow = 53,
}: ContributionHeatmapProps) {
  const days = buildHeatmapDays(dailyVolumeKg, weeksToShow, new Date(), activeDates)

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto pb-1">
        <div
          className="grid grid-flow-col gap-1"
          style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
        >
          {days.map((day) => {
            const label =
              day.volumeKg > 0
                ? `${Math.round(day.volumeKg)} kg déplacés`
                : activeDates.has(day.date)
                  ? 'séance réalisée, sans détail enregistré'
                  : 'aucune séance'
            return (
              <div
                key={day.date}
                title={`${day.date} · ${label}`}
                className={cn('size-3 rounded-sm', LEVEL_CLASS[day.level])}
              />
            )
          })}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Moins</span>
        {([0, 1, 2, 3] as const).map((level) => (
          <div key={level} className={cn('size-3 rounded-sm', LEVEL_CLASS[level])} />
        ))}
        <span>Plus</span>
      </div>
    </div>
  )
}
