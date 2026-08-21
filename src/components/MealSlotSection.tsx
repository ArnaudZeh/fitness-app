import { Copy, Plus, Trash2 } from 'lucide-react'
import { AddFoodLogDialog } from '@/components/AddFoodLogDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDeleteFoodLog, useDuplicateMealSlot, useMostRecentLoggedDate } from '@/hooks/useFoodLogs'
import type { FoodLog } from '@/lib/food-logs-api'
import type { MealSlot } from '@/lib/meal-slots-api'

function formatShortDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

interface MealSlotSectionProps {
  slot: MealSlot
  logs: FoodLog[]
  loggedDate: string
}

export function MealSlotSection({ slot, logs, loggedDate }: MealSlotSectionProps) {
  const deleteFoodLog = useDeleteFoodLog()
  const duplicateMealSlot = useDuplicateMealSlot()
  // Only offered on an empty meal — duplicating on top of something already
  // logged today was scoped out explicitly (skip already-filled meals
  // rather than append or overwrite), so a filled slot has nothing to gain
  // from this button. Querying unconditionally (rather than gating on
  // logs.length) is harmless — react-query caches it per slot/date anyway.
  const { data: sourceDate } = useMostRecentLoggedDate(loggedDate, slot.id)
  const totalCalories = logs.reduce((sum, log) => sum + log.calories, 0)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle as="h2" className="text-lg">
          {slot.name}
        </CardTitle>
        <span className="text-sm text-muted-foreground">{Math.round(totalCalories)} kcal</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {logs.length === 0 && (
          <p className="text-sm text-muted-foreground">Rien loggé pour ce repas.</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-sm">
                {log.name}
                {log.quantity_g !== null ? ` (${log.quantity_g}g)` : ''}
              </span>
              <span className="text-xs text-muted-foreground">
                {log.calories} kcal
                {log.protein_g !== null ? ` · P ${log.protein_g}g` : ''}
                {log.carbs_g !== null ? ` · G ${log.carbs_g}g` : ''}
                {log.fat_g !== null ? ` · L ${log.fat_g}g` : ''}
              </span>
            </div>
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer ${log.name}`}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              }
              title="Supprimer cet aliment ?"
              description={`« ${log.name} » sera retiré du repas « ${slot.name} ».`}
              confirmLabel="Supprimer"
              onConfirm={() => deleteFoodLog.mutateAsync({ id: log.id, loggedDate })}
            />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <AddFoodLogDialog
            mealSlotId={slot.id}
            loggedDate={loggedDate}
            trigger={
              <Button type="button" variant="outline" size="sm" className="self-start">
                <Plus /> Ajouter un aliment
              </Button>
            }
          />
          {logs.length === 0 && sourceDate != null && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={duplicateMealSlot.isPending}
              onClick={() =>
                void duplicateMealSlot.mutateAsync({
                  mealSlotId: slot.id,
                  fromDate: sourceDate,
                  toDate: loggedDate,
                })
              }
            >
              <Copy />
              {duplicateMealSlot.isPending
                ? 'Duplication…'
                : `Dupliquer (${formatShortDate(sourceDate)})`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
