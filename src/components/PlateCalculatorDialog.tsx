import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { calculatePlateBreakdown, DEFAULT_BAR_WEIGHT_KG } from '@/lib/plate-calculator'

interface PlateCalculatorDialogProps {
  trigger: React.ReactNode
  initialTargetWeightKg?: number
}

export function PlateCalculatorDialog({
  trigger,
  initialTargetWeightKg,
}: PlateCalculatorDialogProps) {
  const [open, setOpen] = useState(false)
  const [targetWeight, setTargetWeight] = useState('')
  const [barWeight, setBarWeight] = useState(DEFAULT_BAR_WEIGHT_KG.toString())

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setTargetWeight(
        initialTargetWeightKg !== undefined ? initialTargetWeightKg.toString() : '',
      )
    }
  }

  const parsedTarget = Number(targetWeight)
  const parsedBar = Number(barWeight)
  const breakdown =
    targetWeight.trim() !== '' &&
    barWeight.trim() !== '' &&
    !Number.isNaN(parsedTarget) &&
    !Number.isNaN(parsedBar)
      ? calculatePlateBreakdown(parsedTarget, parsedBar)
      : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calculateur de plaques</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plate-bar-weight">Barre (kg)</Label>
              <Input
                id="plate-bar-weight"
                type="number"
                min={0}
                step={0.5}
                className="h-12 text-lg!"
                value={barWeight}
                onChange={(event) => setBarWeight(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plate-target-weight">Charge cible (kg)</Label>
              <Input
                id="plate-target-weight"
                type="number"
                min={0}
                step={0.5}
                className="h-12 text-lg!"
                value={targetWeight}
                onChange={(event) => setTargetWeight(event.target.value)}
              />
            </div>
          </div>

          {breakdown && (
            <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
              {breakdown.perSide.length === 0 ? (
                <p className="text-center font-mono text-lg font-semibold tabular-nums">
                  Barre seule
                </p>
              ) : (
                <ul className="flex flex-wrap items-center justify-center gap-2">
                  {breakdown.perSide.map((group) => (
                    <li
                      key={group.plateKg}
                      className="rounded-md bg-primary/10 px-3 py-2 font-mono text-lg font-semibold tabular-nums text-primary"
                    >
                      {group.count > 1 ? `${group.count} x ` : ''}
                      {group.plateKg}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-center text-sm text-muted-foreground">
                Par côté, en plus de la barre.
              </p>
              {!breakdown.isExact && (
                <p className="text-center text-sm text-destructive">
                  Charge non atteignable exactement avec ces plaques, le plus proche :{' '}
                  {breakdown.achievedWeightKg} kg.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
