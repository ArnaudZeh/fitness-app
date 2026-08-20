import { cn } from '@/lib/utils'

export type RingId = 'sessions' | 'tonnage' | 'weight' | 'nutrition'

export interface RingDatum {
  id: RingId
  // null = not enough data to judge yet, rendered as an empty track rather
  // than a 0% fill (0% would misleadingly read as "underperforming").
  ratio: number | null
  color: string
  label: string
}

interface ActivityRingsProps {
  rings: [RingDatum, RingDatum, RingDatum, RingDatum] // outer to inner
  centerValue: string
  centerLabel: string
  onSelectRing: (id: RingId) => void
  className?: string
}

const VIEWBOX = 200
const CENTER = VIEWBOX / 2
// Radius step between rings equals the stroke width exactly, so adjacent
// bands sit flush against each other with no visible gap (outer edge of
// ring N = inner edge of ring N-1). Center hole radius is whatever's left
// inside the innermost ring (35 with 4 rings at STROKE_WIDTH 14 — down from
// 49 with 3, still enough for the 2-line value/label text, checked visually
// at 375px when the 4th ring was added).
const STROKE_WIDTH = 14
const RADII = [84, 70, 56, 42] // outer to inner, each STROKE_WIDTH apart
// Matches STROKE_WIDTH exactly rather than padding past it: with rings this
// tightly packed, a wider hit band would overlap into the neighboring
// ring's own hit zone and steal its taps. This trades some touch-target
// margin (normally ≥44px) for correct per-ring tap disambiguation — the
// ring tap is a bonus shortcut, "Voir les stats complètes" stays the
// reliable, fully-accessible way to reach the same detail.
const HIT_STROKE_WIDTH = STROKE_WIDTH

// Apple-Watch-style concentric activity rings: each ring is its own
// independently tappable band (outer → inner), opening a detail popup for
// just that metric — not a single combined tap target. Sized by its
// container (no fixed pixel size) — see WeeklyRingsSection's max-w wrapper
// on the dashboard for the actual rendered size.
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
          const r = RADII[i] ?? 56
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
        y={CENTER - 6}
        textAnchor="middle"
        className="fill-foreground font-mono text-2xl font-semibold"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {centerValue}
      </text>
      <text
        x={CENTER}
        y={CENTER + 16}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px] tracking-wide uppercase"
      >
        {centerLabel}
      </text>
    </svg>
  )
}
