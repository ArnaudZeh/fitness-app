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
  size?: number
}

const VIEWBOX = 200
const CENTER = VIEWBOX / 2
const RADII = [82, 62, 42] // outer to inner
const STROKE_WIDTH = 15
// Wider than the visible stroke so each ring's tap target still clears the
// 44px touch-target guideline even though the drawn band is thinner.
const HIT_STROKE_WIDTH = 40

// Apple-Watch-style concentric activity rings: each ring is its own
// independently tappable band (outer → inner), opening a detail popup for
// just that metric — not a single combined tap target.
export function ActivityRings({
  rings,
  centerValue,
  centerLabel,
  onSelectRing,
  size = 200,
}: ActivityRingsProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      width={size}
      height={size}
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
        y={CENTER - 4}
        textAnchor="middle"
        className="fill-foreground font-mono text-3xl font-semibold"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {centerValue}
      </text>
      <text
        x={CENTER}
        y={CENTER + 20}
        textAnchor="middle"
        className="fill-muted-foreground text-[11px] tracking-wide uppercase"
      >
        {centerLabel}
      </text>
    </svg>
  )
}
