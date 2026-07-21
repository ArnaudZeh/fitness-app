import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ExerciseSlotFormDialog } from '@/components/ExerciseSlotFormDialog'
import { SessionTemplateFormDialog } from '@/components/SessionTemplateFormDialog'
import { useCreateExercise, useExercises } from '@/hooks/useExercises'
import {
  useCreateSessionTemplateExercise,
  useDeleteSessionTemplate,
  useDeleteSessionTemplateExercise,
  useSessionTemplateExercises,
  useSwapSessionTemplateExerciseOrder,
  useUpdateSessionTemplate,
  useUpdateSessionTemplateExercise,
} from '@/hooks/useSessionTemplates'
import { getSwapPair } from '@/lib/ordering'
import type { SessionTemplate } from '@/lib/sessions-api'

export function SessionTemplateCard({
  template,
  isFirst,
  isLast,
  onMove,
}: {
  template: SessionTemplate
  isFirst: boolean
  isLast: boolean
  onMove: (direction: 'up' | 'down') => void
}) {
  const { data: exercises } = useExercises()
  const { data: slots } = useSessionTemplateExercises(template.id)
  const createExercise = useCreateExercise()
  const createSlot = useCreateSessionTemplateExercise(template.id)
  const updateSlot = useUpdateSessionTemplateExercise(template.id)
  const deleteSlot = useDeleteSessionTemplateExercise(template.id)
  const swapSlotOrder = useSwapSessionTemplateExerciseOrder(template.id)
  const updateTemplate = useUpdateSessionTemplate(template.block_id)
  const deleteTemplate = useDeleteSessionTemplate(template.block_id)

  const sortedSlots = slots ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle as="h3">{template.name}</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Monter ce jour"
            disabled={isFirst}
            onClick={() => onMove('up')}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Descendre ce jour"
            disabled={isLast}
            onClick={() => onMove('down')}
          >
            <ArrowDown />
          </Button>
          <SessionTemplateFormDialog
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Renommer ce jour">
                <Pencil />
              </Button>
            }
            initialName={template.name}
            submitLabel="Enregistrer"
            onSubmit={async (name) => {
              await updateTemplate.mutateAsync({ id: template.id, name })
            }}
          />
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Supprimer ce jour">
                <Trash2 />
              </Button>
            }
            title="Supprimer ce jour ?"
            description="Cette action est irréversible et supprimera ses exercices."
            confirmLabel="Supprimer"
            onConfirm={async () => {
              await deleteTemplate.mutateAsync(template.id)
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {sortedSlots.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun exercice pour l'instant.</p>
        )}
        <ul className="flex flex-col gap-2">
          {sortedSlots.map((slot, index) => (
            <li
              key={slot.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
            >
              <div>
                <p className="font-medium">{slot.exercise.name}</p>
                <p className="text-sm text-muted-foreground">
                  {slot.target_sets} x {slot.target_reps_min}-{slot.target_reps_max}
                  {slot.target_rpe !== null ? ` @ RPE ${slot.target_rpe}` : ''}
                </p>
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
        <ExerciseSlotFormDialog
          trigger={
            <Button variant="outline" size="sm" className="mt-2 self-start">
              <Plus /> Ajouter un exercice
            </Button>
          }
          exercises={exercises ?? []}
          submitLabel="Ajouter l'exercice"
          onCreateExercise={(input) => createExercise.mutateAsync(input)}
          onSubmit={async (input) => {
            await createSlot.mutateAsync(input)
          }}
        />
      </CardContent>
    </Card>
  )
}
