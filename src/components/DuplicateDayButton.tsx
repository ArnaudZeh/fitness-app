import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDuplicateDay, useFoodLogs, useMostRecentLoggedDate } from '@/hooks/useFoodLogs'
import type { FoodLog } from '@/lib/food-logs-api'
import type { MealSlot } from '@/lib/meal-slots-api'

function formatShortDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

interface DuplicateDayButtonProps {
  mealSlots: MealSlot[]
  foodLogs: FoodLog[]
  today: string
}

// Whole-day counterpart to the per-meal "Dupliquer" button in
// MealSlotSection — same "skip already-filled meals" rule, applied to
// every meal at once instead of one at a time. Pulls every empty meal
// today from a single source day (the most recent day with anything
// logged at all), not a per-slot patchwork from different days, so the
// result reads as "yesterday's meals", not a mismatched mix.
export function DuplicateDayButton({ mealSlots, foodLogs, today }: DuplicateDayButtonProps) {
  const { data: sourceDate } = useMostRecentLoggedDate(today)
  // Only fetched once a candidate source day is known — needed to check
  // which *specific* empty slots actually have something on that day, so
  // the button never offers a duplicate that would silently do nothing
  // (same "no dead-end button" bar as generer_programme's empty-pool fix).
  const { data: sourceDateLogs } = useFoodLogs(sourceDate ?? '', { enabled: sourceDate != null })
  const duplicateDay = useDuplicateDay()

  const filledTodaySlotIds = new Set(foodLogs.map((log) => log.meal_slot_id))
  const sourceDateSlotIds = new Set((sourceDateLogs ?? []).map((log) => log.meal_slot_id))
  const slotsToDuplicate = mealSlots
    .filter((slot) => !filledTodaySlotIds.has(slot.id) && sourceDateSlotIds.has(slot.id))
    .map((slot) => slot.id)

  if (sourceDate == null || slotsToDuplicate.length === 0) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="self-start"
      disabled={duplicateDay.isPending}
      onClick={() =>
        void duplicateDay.mutateAsync({
          mealSlotIds: slotsToDuplicate,
          fromDate: sourceDate,
          toDate: today,
        })
      }
    >
      <Copy />
      {duplicateDay.isPending
        ? 'Duplication…'
        : `Dupliquer les repas du ${formatShortDate(sourceDate)}`}
    </Button>
  )
}
