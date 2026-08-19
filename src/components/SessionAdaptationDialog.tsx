import { useState } from 'react'
import { Link } from 'react-router'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ExerciseThumbnail } from '@/components/ExerciseThumbnail'
import { useAiProviderKeys } from '@/hooks/useAiProviderKeys'
import { useProfile } from '@/hooks/useProfile'
import { useWeightEntries } from '@/hooks/useWeightEntries'
import { useCycleEntries } from '@/hooks/useCycleEntries'
import { useCoachingProfile } from '@/hooks/useCoachingProfile'
import { useNutritionTargets } from '@/hooks/useNutritionTargets'
import { useRecentFoodLogs } from '@/hooks/useFoodLogs'
import { useSetHistory } from '@/hooks/useAnalytics'
import {
  useApplySessionAdaptation,
  useGenerateSessionAdaptation,
} from '@/hooks/useSessionAdaptation'
import { AI_PROVIDER_LABELS, type AiProvider } from '@/lib/ai-keys-api'
import { buildUserProfileContext } from '@/lib/user-context'
import { buildTrendSummary } from '@/lib/analytics'
import type { ProgramFocus } from '@/lib/programs-api'
import type { SessionTemplateExercise } from '@/lib/sessions-api'
import type { AvailableExercise } from '@/lib/program-generation-api'

export function SessionAdaptationDialog({
  sessionTemplateId,
  focus,
  currentSlots,
}: {
  sessionTemplateId: string
  focus: ProgramFocus
  currentSlots: SessionTemplateExercise[]
}) {
  const [open, setOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<AiProvider | null>(null)
  const [dayContext, setDayContext] = useState('')

  const { data: keyStatuses } = useAiProviderKeys()
  const { data: profile } = useProfile()
  const { data: weightEntries } = useWeightEntries()
  const { data: cycleEntries } = useCycleEntries({
    enabled: Boolean(profile?.cycle_module_enabled),
  })
  const { data: coachingProfile } = useCoachingProfile()
  const { data: nutritionTargets } = useNutritionTargets()
  const { data: recentFoodLogs } = useRecentFoodLogs(7)
  const { data: history } = useSetHistory()
  const generateAdaptation = useGenerateSessionAdaptation()
  const applyAdaptation = useApplySessionAdaptation(sessionTemplateId)

  const configuredProviders = (keyStatuses ?? [])
    .filter((status) => status.is_valid)
    .map((status) => status.provider)
  const activeProvider = selectedProvider ?? configuredProviders[0] ?? null

  const availableExercises: AvailableExercise[] = Array.from(
    new Map(
      (history ?? []).map((record) => [
        record.exerciseId,
        {
          id: record.exerciseId,
          name: record.exerciseName,
          muscleGroup: record.muscleGroup,
        },
      ]),
    ).values(),
  )
  // Kept separate from availableExercises (not sent to the AI — it's local
  // UI lookup data, no reason to bloat the request with image URLs).
  const thumbnailByExerciseId = new Map(
    (history ?? []).map((record) => [
      record.exerciseId,
      { imageUrl: record.imageUrl, muscleGroup: record.muscleGroup },
    ]),
  )

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      generateAdaptation.reset()
      setDayContext('')
    }
  }

  function handleGenerate() {
    if (!activeProvider || !profile) return
    generateAdaptation.mutate({
      provider: activeProvider,
      profileContext: buildUserProfileContext(
        profile,
        weightEntries ?? [],
        cycleEntries ?? [],
        coachingProfile ?? null,
        nutritionTargets ?? null,
        recentFoodLogs ?? [],
      ),
      trendSummary: buildTrendSummary(history ?? []),
      currentExercises: currentSlots.map((slot) => ({
        exerciseId: slot.exercise_id,
        exerciseName: slot.exercise.name,
        targetSets: slot.target_sets,
        targetRepsMin: slot.target_reps_min,
        targetRepsMax: slot.target_reps_max,
        targetRpe: slot.target_rpe,
        targetWeightKg: slot.target_weight_kg,
      })),
      availableExercises,
      dayContext,
    })
  }

  async function handleApply() {
    if (!generateAdaptation.data) return
    await applyAdaptation.mutateAsync({
      focus,
      existingSlots: currentSlots,
      proposal: generateAdaptation.data,
    })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles /> Adapter avec l'IA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adapter cette séance avec l'IA</DialogTitle>
        </DialogHeader>

        {configuredProviders.length === 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Configure une clé API (Anthropic ou OpenAI) dans ton profil pour adapter
              cette séance.
            </p>
            <Button asChild size="sm" className="self-start">
              <Link to="/profile">Configurer une clé</Link>
            </Button>
          </div>
        )}

        {configuredProviders.length > 0 && availableExercises.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Logue quelques séances d'abord. L'IA ne propose que des exercices que tu as
            déjà pratiqués.
          </p>
        )}

        {configuredProviders.length > 0 &&
          availableExercises.length > 0 &&
          !generateAdaptation.data && (
            <div className="flex flex-col gap-4">
              {configuredProviders.length > 1 && (
                <div className="flex items-center gap-1 self-start rounded-lg border border-border p-0.5">
                  {configuredProviders.map((provider) => (
                    <Button
                      key={provider}
                      type="button"
                      size="sm"
                      variant={activeProvider === provider ? 'default' : 'ghost'}
                      onClick={() => setSelectedProvider(provider)}
                    >
                      {AI_PROVIDER_LABELS[provider]}
                    </Button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="day-context">Comment tu te sens aujourd'hui ?</Label>
                <Textarea
                  id="day-context"
                  value={dayContext}
                  onChange={(event) => setDayContext(event.target.value)}
                  placeholder="Optionnel · ex. fatigué, courbatures, épaule qui tire, peu de temps…"
                />
              </div>

              {generateAdaptation.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {generateAdaptation.error instanceof Error
                    ? generateAdaptation.error.message
                    : 'Impossible de générer une adaptation.'}
                </p>
              )}

              <Button
                type="button"
                disabled={!activeProvider || generateAdaptation.isPending}
                onClick={handleGenerate}
              >
                <Sparkles />{' '}
                {generateAdaptation.isPending ? 'Génération…' : 'Générer une proposition'}
              </Button>
            </div>
          )}

        {generateAdaptation.data && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {generateAdaptation.data.rationale}
            </p>
            <ul className="flex flex-col gap-2">
              {generateAdaptation.data.exercises.map((exercise, index) => (
                <li
                  key={`${exercise.exerciseId}-${index}`}
                  className="flex items-center gap-2 rounded-md border border-border p-2"
                >
                  <ExerciseThumbnail
                    imageUrl={
                      thumbnailByExerciseId.get(exercise.exerciseId)?.imageUrl ?? null
                    }
                    muscleGroup={
                      thumbnailByExerciseId.get(exercise.exerciseId)?.muscleGroup ?? null
                    }
                  />
                  <div>
                    <p className="font-medium">{exercise.exerciseName}</p>
                    <p className="text-sm text-muted-foreground">
                      {exercise.targetSets} × {exercise.targetRepsMin}-
                      {exercise.targetRepsMax} reps
                      {exercise.targetRpe !== null && ` @RPE ${exercise.targetRpe}`}
                      {exercise.targetWeightKg !== null &&
                        ` · ${exercise.targetWeightKg} kg`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {applyAdaptation.isError && (
              <p role="alert" className="text-sm text-destructive">
                Impossible d'appliquer cette adaptation.
              </p>
            )}

            <DialogFooter className="mx-0 mb-0 flex-wrap rounded-none border-t-0 bg-transparent p-0 sm:justify-start">
              <Button
                type="button"
                disabled={applyAdaptation.isPending}
                onClick={() => void handleApply()}
              >
                {applyAdaptation.isPending ? 'Application…' : 'Appliquer'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={generateAdaptation.isPending}
                onClick={handleGenerate}
              >
                Régénérer
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => generateAdaptation.reset()}
              >
                Annuler
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
