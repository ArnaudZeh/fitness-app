import { cn } from '@/lib/utils'

interface MacroProgressBarProps {
  label: string
  consumed: number
  target: number | null
  unit: string
}

// No dedicated Progress component in the design system yet (ContributionHeatmap
// made the same call for its own grid) — a plain filled div is simpler than
// pulling in a new shadcn primitive for a single bar shape.
export function MacroProgressBar({ label, consumed, target, unit }: MacroProgressBarProps) {
  const percent = target && target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0
  const isOver = target !== null && consumed > target

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {Math.round(consumed)}
          {target !== null ? ` / ${target}` : ''} {unit}
        </span>
      </div>
      {target !== null ? (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full', isOver ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Objectif non défini</p>
      )}
    </div>
  )
}
