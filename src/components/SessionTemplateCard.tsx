import { useState } from 'react'
import { Copy, GripVertical, Link2, Pencil, Play, Plus, Trash2, Unlink } from 'lucide-react'
import { useNavigate } from 'react-router'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DuplicateDayDialog } from '@/components/DuplicateDayDialog'
import { ExerciseSlotFlow } from '@/components/ExerciseSlotFlow'
import { ExerciseThumbnail } from '@/components/ExerciseThumbnail'
import { LinkSupersetDialog } from '@/components/LinkSupersetDialog'
import { SessionAdaptationDialog } from '@/components/SessionAdaptationDialog'
import { useCreateExercise, useExercises } from '@/hooks/useExercises'
import {
  useCreateSessionTemplateExercise,
  useDeleteSessionTemplateExercise,
  useDuplicateSessionTemplateExercises,
  useReorderSessionTemplateExercises,
  useSessionTemplateExercises,
  useSetGroupRestSeconds,
  useUpdateSessionTemplateDayType,
  useUpdateSessionTemplateExercise,
} from '@/hooks/useSessionTemplates'
import { useStartSessionLog } from '@/hooks/useSessionLogs'
import { computeBlocks, inferGroupAfterMove, linkIntoSuperset, unlinkFromSuperset } from '@/lib/ordering'
import type { LinkTarget } from '@/lib/ordering'
import type { ProgramFocus } from '@/lib/programs-api'
import {
  DAY_TYPE_LABELS,
  DEFAULT_REST_SECONDS_BY_FOCUS,
  WEEKDAY_LABELS,
  type DayType,
} from '@/lib/sessions-api'
import type {
  SessionTemplate,
  SessionTemplateExercise,
  SessionTemplateExerciseInput,
} from '@/lib/sessions-api'
import type { Exercise } from '@/lib/exercises-api'

const DAY_TYPE_OPTIONS: DayType[] = ['rest', 'training']

export function SessionTemplateCard({
  template,
  focus,
  allTemplates,
}: {
  template: SessionTemplate
  focus: ProgramFocus
  allTemplates: SessionTemplate[]
}) {
  const navigate = useNavigate()
  const { data: exercises } = useExercises()
  const { data: slots } = useSessionTemplateExercises(template.id)
  const createExercise = useCreateExercise()
  const createSlot = useCreateSessionTemplateExercise(template.id)
  const updateSlot = useUpdateSessionTemplateExercise(template.id)
  const deleteSlot = useDeleteSessionTemplateExercise(template.id)
  const reorderSlots = useReorderSessionTemplateExercises(template.id)
  const setGroupRest = useSetGroupRestSeconds(template.id)
  const updateDayType = useUpdateSessionTemplateDayType(template.program_id)
  const duplicateExercises = useDuplicateSessionTemplateExercises(template.program_id)
  const startSessionLog = useStartSessionLog(template.program_id)

  // A small activation distance keeps a plain tap (edit/delete buttons,
  // opening the day-type toggle) from being mistaken for the start of a
  // drag — matters most on touch, where every tap is technically a tiny
  // pointer move. KeyboardSensor gives arrow-key reordering once a handle
  // is focused, replacing the old dedicated up/down buttons with dnd-kit's
  // own accessible fallback instead of maintaining both.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const sortedSlots = slots ?? []
  const isTrainingDay = template.day_type === 'training'
  const blocks = computeBlocks(sortedSlots)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sortedSlots.findIndex((s) => s.id === active.id)
    const newIndex = sortedSlots.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(sortedSlots, oldIndex, newIndex)
    const newGroup = inferGroupAfterMove(reordered, active.id as string)
    const withUpdatedGroup = reordered.map((slot) =>
      slot.id === active.id ? { ...slot, superset_group: newGroup } : slot,
    )
    reorderSlots.mutate(withUpdatedGroup)
  }

  async function handleLink(currentSlot: SessionTemplateExercise, target: LinkTarget<SessionTemplateExercise>) {
    await reorderSlots.mutateAsync(linkIntoSuperset(sortedSlots, currentSlot, target))
  }

  function handleUnlink(slotId: string) {
    reorderSlots.mutate(unlinkFromSuperset(sortedSlots, slotId))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle as="h3">{WEEKDAY_LABELS[template.day_of_week]}</CardTitle>
        <div className="flex items-center gap-2">
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
          {sortedSlots.length > 0 && (
            <DuplicateDayDialog
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Dupliquer ${WEEKDAY_LABELS[template.day_of_week]} vers un autre jour`}
                >
                  <Copy />
                </Button>
              }
              sourceTemplate={template}
              otherTemplates={allTemplates.filter((t) => t.id !== template.id)}
              onDuplicate={(targetTemplateId) =>
                duplicateExercises.mutateAsync({
                  sourceTemplateId: template.id,
                  targetTemplateId,
                })
              }
            />
          )}
        </div>
      </CardHeader>
      {isTrainingDay && (
        <CardContent className="flex flex-col gap-2">
          {sortedSlots.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun exercice pour l'instant.
            </p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={sortedSlots.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="flex flex-col gap-2">
                {blocks.map((block) =>
                  block.kind === 'group' ? (
                    <li key={`group-${block.group}`}>
                      <SupersetGroupBlock
                        group={block.group}
                        slots={block.slots}
                        focus={focus}
                        exercises={exercises ?? []}
                        daySlots={sortedSlots}
                        onSetGroupRest={(slotIds, restSeconds) =>
                          setGroupRest.mutate({ slotIds, restSeconds })
                        }
                        settingGroupRest={setGroupRest.isPending}
                        onCreateExercise={(input) => createExercise.mutateAsync(input)}
                        onUpdate={(id, input) => updateSlot.mutateAsync({ id, input })}
                        onDelete={(id) => deleteSlot.mutateAsync(id)}
                        onLink={handleLink}
                        onUnlink={handleUnlink}
                      />
                    </li>
                  ) : (
                    <SlotRow
                      key={block.slot.id}
                      slot={block.slot}
                      focus={focus}
                      exercises={exercises ?? []}
                      daySlots={sortedSlots}
                      onCreateExercise={(input) => createExercise.mutateAsync(input)}
                      onUpdate={(id, input) => updateSlot.mutateAsync({ id, input })}
                      onDelete={(id) => deleteSlot.mutateAsync(id)}
                      onLink={handleLink}
                      onUnlink={handleUnlink}
                    />
                  ),
                )}
              </ul>
            </SortableContext>
          </DndContext>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ExerciseSlotFlow
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
              existingSupersetGroups={sortedSlots.map((slot) => slot.superset_group)}
              onSubmitSuperset={async (inputs) => {
                // Sequential, not Promise.all: createSessionTemplateExercise
                // computes each new order_index from a fresh fetch of
                // existing slots, so concurrent inserts could race and land
                // on the same order_index instead of ending up contiguous.
                for (const input of inputs) {
                  await createSlot.mutateAsync(input)
                }
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

interface SlotRowActions {
  focus: ProgramFocus
  exercises: Exercise[]
  daySlots: SessionTemplateExercise[]
  onCreateExercise: (input: { name: string; muscle_group: string | null }) => Promise<Exercise>
  onUpdate: (id: string, input: SessionTemplateExerciseInput) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
  onLink: (currentSlot: SessionTemplateExercise, target: LinkTarget<SessionTemplateExercise>) => Promise<void>
  onUnlink: (slotId: string) => void
}

function SlotRow({ slot, ...actions }: { slot: SessionTemplateExercise } & SlotRowActions) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 rounded-md border border-border bg-card p-2 ${isDragging ? 'z-10 opacity-70' : ''}`}
    >
      <button
        type="button"
        aria-label="Réorganiser cet exercice"
        className="flex shrink-0 cursor-grab touch-none items-center justify-center self-stretch px-1 text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <ExerciseThumbnail
          imageUrl={slot.exercise.image_url}
          muscleGroup={slot.exercise.muscle_group}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 truncate font-medium">{slot.exercise.name}</p>
            {slot.is_unilateral && (
              <Badge variant="outline" className="shrink-0">
                Unilatéral
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {slot.target_sets} x {slot.target_reps_min}-{slot.target_reps_max}
            {slot.target_rpe !== null ? ` @ RPE ${slot.target_rpe}` : ''}
            {slot.target_weight_kg !== null ? ` · ${slot.target_weight_kg} kg` : ''} · repos{' '}
            {slot.target_rest_seconds ?? DEFAULT_REST_SECONDS_BY_FOCUS[actions.focus]}s
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {slot.superset_group === null ? (
          <LinkSupersetDialog
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Lier cet exercice en superset">
                <Link2 />
              </Button>
            }
            currentSlot={slot}
            daySlots={actions.daySlots}
            onLink={(target) => actions.onLink(slot, target)}
          />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Retirer cet exercice du superset"
            onClick={() => actions.onUnlink(slot.id)}
          >
            <Unlink />
          </Button>
        )}
        <ExerciseSlotFlow
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Modifier cet exercice">
              <Pencil />
            </Button>
          }
          exercises={actions.exercises}
          focus={actions.focus}
          initialValue={slot}
          submitLabel="Enregistrer"
          onCreateExercise={actions.onCreateExercise}
          onSubmit={async (input) => {
            await actions.onUpdate(slot.id, input)
          }}
        />
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Supprimer cet exercice">
              <Trash2 />
            </Button>
          }
          title="Supprimer cet exercice ?"
          description="Cette action est irréversible."
          confirmLabel="Supprimer"
          onConfirm={async () => {
            await actions.onDelete(slot.id)
          }}
        />
      </div>
    </li>
  )
}

function SupersetGroupBlock({
  group,
  slots,
  focus,
  onSetGroupRest,
  settingGroupRest,
  ...actions
}: {
  group: string
  slots: SessionTemplateExercise[]
  onSetGroupRest: (slotIds: string[], restSeconds: number) => void
  settingGroupRest: boolean
} & SlotRowActions) {
  const [restInput, setRestInput] = useState('')
  const restValues = new Set(
    slots.map((s) => s.target_rest_seconds ?? DEFAULT_REST_SECONDS_BY_FOCUS[focus]),
  )
  const sharedRestLabel =
    restValues.size === 1 ? `${[...restValues][0]}s pour tout le groupe` : 'Repos par exercice'

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Badge>Superset {group}</Badge>
          <span className="text-xs text-muted-foreground">{sharedRestLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={1}
            placeholder="Repos (s)"
            className="h-7 w-24 text-xs"
            value={restInput}
            onChange={(event) => setRestInput(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={restInput.trim() === '' || settingGroupRest}
            onClick={() => {
              onSetGroupRest(
                slots.map((s) => s.id),
                Number(restInput),
              )
              setRestInput('')
            }}
          >
            Appliquer au groupe
          </Button>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {slots.map((slot) => (
          <SlotRow key={slot.id} slot={slot} focus={focus} {...actions} />
        ))}
      </ul>
    </div>
  )
}
