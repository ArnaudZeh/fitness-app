import { cn } from '@/lib/utils'

interface ContributionHeatmapProps {
  dailyVolumeKg: Map<string, number>
  weeksToShow?: number
}

interface HeatmapDay {
  date: string
  volumeKg: number
  level: 0 | 1 | 2 | 3
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function buildHeatmapDays(
  dailyVolumeKg: Map<string, number>,
  weeksToShow: number,
  now: Date = new Date(),
): HeatmapDay[] {
  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)

  const todayIsoDayOfWeek = today.getUTCDay() === 0 ? 7 : today.getUTCDay()
  const gridEnd = new Date(today)
  gridEnd.setUTCDate(today.getUTCDate() + (7 - todayIsoDayOfWeek))

  // gridEnd is always a Sunday, so stepping back a whole number of weeks
  // and one more day lands exactly on a Monday — every column is a full
  // calendar week, no separate alignment step needed.
  const gridStart = new Date(gridEnd)
  gridStart.setUTCDate(gridEnd.getUTCDate() - weeksToShow * 7 + 1)

  const maxVolume = Math.max(0, ...dailyVolumeKg.values())
  const days: HeatmapDay[] = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    const date = toIsoDate(cursor)
    const volumeKg = dailyVolumeKg.get(date) ?? 0
    let level: HeatmapDay['level'] = 0
    if (volumeKg > 0 && maxVolume > 0) {
      const ratio = volumeKg / maxVolume
      level = ratio <= 1 / 3 ? 1 : ratio <= 2 / 3 ? 2 : 3
    }
    days.push({ date, volumeKg, level })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
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
  weeksToShow = 53,
}: ContributionHeatmapProps) {
  const days = buildHeatmapDays(dailyVolumeKg, weeksToShow)

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto pb-1">
        <div
          className="grid grid-flow-col gap-1"
          style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
        >
          {days.map((day) => (
            <div
              key={day.date}
              title={`${day.date} — ${day.volumeKg > 0 ? `${Math.round(day.volumeKg)} kg déplacés` : 'aucune séance'}`}
              className={cn('size-3 rounded-sm', LEVEL_CLASS[day.level])}
            />
          ))}
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
