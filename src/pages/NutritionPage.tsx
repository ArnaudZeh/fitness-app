import { DuplicateDayButton } from '@/components/DuplicateDayButton'
import { ManageMealSlots } from '@/components/ManageMealSlots'
import { MealSlotOnboarding } from '@/components/MealSlotOnboarding'
import { MealSlotSection } from '@/components/MealSlotSection'
import { NutritionTargetsCard } from '@/components/NutritionTargetsCard'
import { useCoachingProfile } from '@/hooks/useCoachingProfile'
import { useFoodLogs } from '@/hooks/useFoodLogs'
import { useMealSlots } from '@/hooks/useMealSlots'
import { useNutritionTargets } from '@/hooks/useNutritionTargets'
import { useProfile } from '@/hooks/useProfile'
import { useAverageWeeklyTrainingMinutes } from '@/hooks/useTrainingFrequency'
import { useWeightEntries } from '@/hooks/useWeightEntries'
import { computeConsumedTotals } from '@/lib/nutrition-calc'

function todayLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function NutritionPage() {
  const today = todayLocalDate()
  const { data: mealSlots, isLoading: slotsLoading } = useMealSlots()
  const { data: targets, isLoading: targetsLoading } = useNutritionTargets()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: weightEntries } = useWeightEntries()
  const { data: coachingProfile } = useCoachingProfile()
  const { data: avgWeeklyTrainingMinutes } = useAverageWeeklyTrainingMinutes()
  const { data: foodLogs, isLoading: logsLoading } = useFoodLogs(today)

  const isLoading = slotsLoading || targetsLoading || profileLoading || logsLoading

  if (isLoading || !mealSlots || !targets || !profile || !foodLogs) {
    return <p className="text-muted-foreground">Chargement…</p>
  }

  const latestWeightKg = weightEntries?.[0]?.weight_kg ?? null

  const consumed = computeConsumedTotals(foodLogs)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nutrition</h1>

      {mealSlots.length === 0 ? (
        <MealSlotOnboarding />
      ) : (
        <>
          <NutritionTargetsCard
            targets={targets}
            profile={profile}
            latestWeightKg={latestWeightKg}
            avgWeeklyTrainingMinutes={avgWeeklyTrainingMinutes ?? null}
            avgDailySteps={coachingProfile?.avg_daily_steps ?? null}
            consumed={consumed}
          />
          <DuplicateDayButton mealSlots={mealSlots} foodLogs={foodLogs} today={today} />
          {mealSlots.map((slot) => (
            <MealSlotSection
              key={slot.id}
              slot={slot}
              logs={foodLogs.filter((log) => log.meal_slot_id === slot.id)}
              loggedDate={today}
            />
          ))}
          <ManageMealSlots mealSlots={mealSlots} />
        </>
      )}
    </div>
  )
}
