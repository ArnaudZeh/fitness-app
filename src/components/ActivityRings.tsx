import { cn } from '@/lib/utils'

export type RingId = 'sessions' | 'performance' | 'weight'

export interface RingDatum {
  id: RingId
  // null = not enough data to judge yet, rendered as an empty track rather
  // than a 0% fill (0% would misleadingly read as "underperforming").
  ratio: number | null
  color: string
  label: string
}

interface ActivityRingsProps {
  rings: [RingDatum, RingDatum, RingDatum] // outer to inner
  centerValue: string
  centerLabel: string
  onSelectRing: (id: RingId) => void
  className?: string
}

const VIEWBOX = 200
const CENTER = VIEWBOX / 2
// Slimmer strokes with wider gaps between rings than a first pass, opening
// up the center hole so the value/label text has real breathing room
// instead of crowding the innermost band.
const RADII = [86, 64, 42] // outer to inner
const STROKE_WIDTH = 12
// Wider than the visible stroke so each ring's tap target still clears the
// 44px touch-target guideline even though the drawn band is thinner.
const HIT_STROKE_WIDTH = 36

// Apple-Watch-style concentric activity rings: each ring is its own
// independently tappable band (outer → inner), opening a detail popup for
// just that metric — not a single combined tap target. Sized by its
// container (no fixed pixel size) so a wrapper can make it as large as the
// layout calls for — see WeeklyRingsSection's max-w wrapper on the
// dashboard, sized to fill roughly half the screen on a phone.
export function ActivityRings({
  rings,
  centerValue,
  centerLabel,
  onSelectRing,
  className,
}: ActivityRingsProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      className={cn('h-auto w-full', className)}
      role="group"
      aria-label="Progression de la semaine"
    >
      <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
        {rings.map((ring, i) => {
          const r = RADII[i] ?? 42
          const circumference = 2 * Math.PI * r
          const filled = ring.ratio ?? 0
          const dash = circumference * filled

          return (
            <g key={ring.id}>
              <circle
                cx={CENTER}
                cy={CENTER}
                r={r}
                fill="none"
                stroke="var(--border)"
                strokeWidth={STROKE_WIDTH}
              />
              {ring.ratio !== null && filled > 0 && (
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                />
              )}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={r}
                fill="none"
                stroke="transparent"
                strokeWidth={HIT_STROKE_WIDTH}
                className={cn('cursor-pointer outline-none', 'focus-visible:stroke-ring/50')}
                tabIndex={0}
                role="button"
                aria-label={ring.label}
                onClick={() => onSelectRing(ring.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelectRing(ring.id)
                  }
                }}
              />
            </g>
          )
        })}
      </g>
      <text
        x={CENTER}
        y={CENTER - 8}
        textAnchor="middle"
        className="fill-foreground font-mono text-4xl font-semibold"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {centerValue}
      </text>
      <text
        x={CENTER}
        y={CENTER + 15}
        textAnchor="middle"
        className="fill-muted-foreground text-xs tracking-wide uppercase"
      >
        {centerLabel}
      </text>
    </svg>
  )
}
