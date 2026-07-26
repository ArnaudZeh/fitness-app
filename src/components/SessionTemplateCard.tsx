import { ArrowDown, ArrowUp, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ExerciseSlotFormDialog } from '@/components/ExerciseSlotFormDialog'
import { ExerciseThumbnail } from '@/components/ExerciseThumbnail'
import { SessionAdaptationDialog } from '@/components/SessionAdaptationDialog'
import { useCreateExercise, useExercises } from '@/hooks/useExercises'
import {
  useCreateSessionTemplateExercise,
  useDeleteSessionTemplateExercise,
  useSessionTemplateExercises,
  useSwapSessionTemplateExerciseOrder,
  useUpdateSessionTemplateDayType,
  useUpdateSessionTemplateExercise,
} from '@/hooks/useSessionTemplates'
import { useStartSessionLog } from '@/hooks/useSessionLogs'
import { getSwapPair } from '@/lib/ordering'
import type { ProgramFocus } from '@/lib/programs-api'
import {
  DAY_TYPE_LABELS,
  DEFAULT_REST_SECONDS_BY_FOCUS,
  WEEKDAY_LABELS,
  type DayType,
} from '@/lib/sessions-api'
import type { SessionTemplate } from '@/lib/sessions-api'

const DAY_TYPE_OPTIONS: DayType[] = ['rest', 'training']

export function SessionTemplateCard({
  template,
  focus,
}: {
  template: SessionTemplate
  focus: ProgramFocus
}) {
  const navigate = useNavigate()
  const { data: exercises } = useExercises()
  const { data: slots } = useSessionTemplateExercises(template.id)
  const createExercise = useCreateExercise()
  const createSlot = useCreateSessionTemplateExercise(template.id)
  const updateSlot = useUpdateSessionTemplateExercise(template.id)
  const deleteSlot = useDeleteSessionTemplateExercise(template.id)
  const swapSlotOrder = useSwapSessionTemplateExerciseOrder(template.id)
  const updateDayType = useUpdateSessionTemplateDayType(template.program_id)
  const startSessionLog = useStartSessionLog(template.program_id)

  const sortedSlots = slots ?? []
  const isTrainingDay = template.day_type === 'training'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle as="h3">{WEEKDAY_LABELS[template.day_of_week]}</CardTitle>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {DAY_TYPE_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={template.day_type === option ? 'default' : 'ghost'}
              disabled={updateDayType.isPending}
              onClick={() => {
                if (template.day_type !== option) {
                  updateDayType.mutate({ id: template.id, dayType: option })
                }
              }}
            >
              {DAY_TYPE_LABELS[option]}
            </Button>
          ))}
        </div>
      </CardHeader>
      {isTrainingDay && (
        <CardContent className="flex flex-col gap-2">
          {sortedSlots.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun exercice pour l'instant.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {sortedSlots.map((slot, index) => (
              <li
                key={slot.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
              >
                <div className="flex items-center gap-2">
                  <ExerciseThumbnail
                    imageUrl={slot.exercise.image_url}
                    muscleGroup={slot.exercise.muscle_group}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{slot.exercise.name}</p>
                      {slot.is_unilateral && <Badge variant="outline">Unilatéral</Badge>}
                      {slot.superset_group && (
                        <Badge variant="outline">Superset {slot.superset_group}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {slot.target_sets} x {slot.target_reps_min}-{slot.target_reps_max}
                      {slot.target_rpe !== null ? ` @ RPE ${slot.target_rpe}` : ''} · repos{' '}
                      {slot.target_rest_seconds ?? DEFAULT_REST_SECONDS_BY_FOCUS[focus]}s
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Monter cet exercice"
                    disabled={index === 0}
                    onClick={() => {
                      const pair = getSwapPair(sortedSlots, slot.id, 'up')
                      if (pair) void swapSlotOrder.mutateAsync({ a: pair[0], b: pair[1] })
                    }}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Descendre cet exercice"
                    disabled={index === sortedSlots.length - 1}
                    onClick={() => {
                      const pair = getSwapPair(sortedSlots, slot.id, 'down')
                      if (pair) void swapSlotOrder.mutateAsync({ a: pair[0], b: pair[1] })
                    }}
                  >
                    <ArrowDown />
                  </Button>
                  <ExerciseSlotFormDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Modifier cet exercice"
                      >
                        <Pencil />
                      </Button>
                    }
                    exercises={exercises ?? []}
                    focus={focus}
                    initialValue={slot}
                    submitLabel="Enregistrer"
                    onCreateExercise={(input) => createExercise.mutateAsync(input)}
                    onSubmit={async (input) => {
                      await updateSlot.mutateAsync({ id: slot.id, input })
                    }}
                  />
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Supprimer cet exercice"
                      >
                        <Trash2 />
                      </Button>
                    }
                    title="Supprimer cet exercice ?"
                    description="Cette action est irréversible."
                    confirmLabel="Supprimer"
                    onConfirm={async () => {
                      await deleteSlot.mutateAsync(slot.id)
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ExerciseSlotFormDialog
              trigger={
                <Button variant="outline" size="sm">
                  <Plus /> Ajouter un exercice
                </Button>
              }
              exercises={exercises ?? []}
              focus={focus}
              submitLabel="Ajouter l'exercice"
              onCreateExercise={(input) => createExercise.mutateAsync(input)}
              onSubmit={async (input) => {
                await createSlot.mutateAsync(input)
              }}
            />
            {sortedSlots.length > 0 && (
              <>
                <SessionAdaptationDialog
                  sessionTemplateId={template.id}
                  focus={focus}
                  currentSlots={sortedSlots}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={startSessionLog.isPending}
                  onClick={() =>
                    startSessionLog.mutate(template.id, {
                      onSuccess: (log) => void navigate(`/sessions/${log.id}`),
                    })
                  }
                >
                  <Play /> Démarrer la séance
                </Button>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
