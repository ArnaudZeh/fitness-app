import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowLeftRight,
  Calculator,
  ChevronLeft,
  Copy,
  Mic,
  MicOff,
  Plus,
  Trash2,
  Wind,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ExerciseThumbnail } from '@/components/ExerciseThumbnail'
import { RestTimer } from '@/components/RestTimer'
import { PlateCalculatorDialog } from '@/components/PlateCalculatorDialog'
import { SubstituteExerciseDialog } from '@/components/SubstituteExerciseDialog'
import { useCreateExercise, useExercises } from '@/hooks/useExercises'
import {
  useCompleteSessionLog,
  useCreateSessionLogSet,
  useDeleteSessionLog,
  useDeleteSessionLogSet,
  useSessionLog,
  useSessionLogSets,
  useSessionPlan,
} from '@/hooks/useSessionLogs'
import { useSubstituteSessionTemplateExercise } from '@/hooks/useSessionTemplates'
import { useVoiceSetInput } from '@/hooks/useVoiceSetInput'
import { computeBlocks } from '@/lib/ordering'
import type { Exercise } from '@/lib/exercises-api'
import type { ProgramFocus } from '@/lib/programs-api'
import { DEFAULT_REST_SECONDS_BY_FOCUS, WEEKDAY_LABELS } from '@/lib/sessions-api'
import type { CachedPlanExercise } from '@/lib/offline-db'
import type { SessionLog, SessionLogSet } from '@/lib/session-logs-api'

export function SessionLogPage() {
  const { id } = useParams<{ id: string }>()
  if (!id) throw new Error('Missing session log id in route params')

  const { data: log, isRefreshing } = useSessionLog(id)

  if (!log && isRefreshing) return <p className="text-muted-foreground">Chargement…</p>
  if (!log)
    return (
      <p role="alert" className="text-destructive">
        Séance introuvable.
      </p>
    )

  return <SessionLogDetail log={log} />
}

function SessionLogDetail({ log }: { log: SessionLog }) {
  const navigate = useNavigate()
  const plan = useSessionPlan(log.program_id, log.session_template_id)
  const sets = useSessionLogSets(log.id)
  const completeLog = useCompleteSessionLog(log.id)
  const deleteLog = useDeleteSessionLog()
  const { data: exercises } = useExercises()
  const createExercise = useCreateExercise()
  const substituteProgramExercise = useSubstituteSessionTemplateExercise(log.session_template_id)

  const sortedSlots = plan?.exercises ?? []
  const allSets = sets ?? []
  const isInProgress = log.status === 'in_progress'
  // Falls back to the hypertrophie default if the plan hasn't been cached
  // on this device yet and there's no network to fetch it right now.
  const focus: ProgramFocus = plan?.focus ?? 'hypertrophie'
  const exerciseById = useMemo(
    () => new Map((exercises ?? []).map((exercise) => [exercise.id, exercise])),
    [exercises],
  )

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={`/programs/${log.program_id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Retour au programme
      </Link>

      <div>
        <h1 className="text-xl font-semibold">
          {plan ? WEEKDAY_LABELS[plan.day_of_week] : 'Séance'}
        </h1>
        {plan && <p className="mt-1 text-muted-foreground">{plan.program_name}</p>}
        <Badge variant={isInProgress ? 'outline' : 'default'} className="mt-2">
          {isInProgress ? 'En cours' : 'Terminée'}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/bien-etre">
          <Button variant="outline" size="sm">
            <Wind /> Respiration
          </Button>
        </Link>
        {isInProgress && (
          <Button
            size="sm"
            disabled={completeLog.isPending}
            onClick={() => completeLog.mutate()}
          >
            Terminer la séance
          </Button>
        )}
        <ConfirmDialog
          trigger={
            <Button variant="destructive" size="sm">
              Supprimer
            </Button>
          }
          title="Supprimer cette séance ?"
          description="Cette action est irréversible et supprimera les séries enregistrées."
          confirmLabel="Supprimer définitivement"
          onConfirm={async () => {
            await deleteLog.mutateAsync(log.id)
            void navigate(`/programs/${log.program_id}`)
          }}
        />
      </div>

      <ul className="flex flex-col gap-3">
        {computeBlocks(sortedSlots).map((block) =>
          block.kind === 'group' ? (
            <li
              key={`group-${block.group}`}
              className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3"
            >
              <Badge className="self-start">Superset {block.group}</Badge>
              <ul className="flex flex-col gap-3">
                {block.slots.map((slot) => (
                  <li key={slot.id}>
                    <SessionLogExerciseCard
                      slot={slot}
                      sets={allSets.filter(
                        (set) => set.session_template_exercise_id === slot.id,
                      )}
                      sessionLogId={log.id}
                      focus={focus}
                      disabled={!isInProgress}
                      exercises={exercises ?? []}
                      exerciseById={exerciseById}
                      onCreateExercise={(input) => createExercise.mutateAsync(input)}
                      onSubstituteProgram={(id, exerciseId) =>
                        substituteProgramExercise.mutateAsync({ id, exerciseId })
                      }
                    />
                  </li>
                ))}
              </ul>
            </li>
          ) : (
            <li key={block.slot.id}>
              <SessionLogExerciseCard
                slot={block.slot}
                sets={allSets.filter(
                  (set) => set.session_template_exercise_id === block.slot.id,
                )}
                sessionLogId={log.id}
                focus={focus}
                disabled={!isInProgress}
                exercises={exercises ?? []}
                exerciseById={exerciseById}
                onCreateExercise={(input) => createExercise.mutateAsync(input)}
                onSubstituteProgram={(id, exerciseId) =>
                  substituteProgramExercise.mutateAsync({ id, exerciseId })
                }
              />
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

function SessionLogExerciseCard({
  slot,
  sets,
  sessionLogId,
  focus,
  disabled,
  exercises,
  exerciseById,
  onCreateExercise,
  onSubstituteProgram,
}: {
  slot: CachedPlanExercise
  sets: SessionLogSet[]
  sessionLogId: string
  focus: ProgramFocus
  disabled: boolean
  exercises: Exercise[]
  exerciseById: Map<string, Exercise>
  onCreateExercise: (input: { name: string; muscle_group: string | null }) => Promise<Exercise>
  onSubstituteProgram: (slotId: string, exerciseId: string) => Promise<void>
}) {
  const createSet = useCreateSessionLogSet(sessionLogId)
  const deleteSet = useDeleteSessionLogSet()
  const [weight, setWeight] = useState(slot.target_weight_kg?.toString() ?? '')
  const [reps, setReps] = useState(slot.target_reps_min.toString())
  const [rpe, setRpe] = useState('')
  const [activeRest, setActiveRest] = useState<{ key: string; seconds: number } | null>(
    null,
  )
  const voiceInput = useVoiceSetInput((parsed) => {
    if (parsed.weightKg !== null) setWeight(parsed.weightKg.toString())
    if (parsed.reps !== null) setReps(parsed.reps.toString())
    if (parsed.rpe !== null) setRpe(parsed.rpe.toString())
  })

  const sortedSets = [...sets].sort((a, b) => a.set_number - b.set_number)
  const nextSetNumber = sortedSets.length + 1
  const restSeconds = slot.target_rest_seconds ?? DEFAULT_REST_SECONDS_BY_FOCUS[focus]

  // Substituting an exercise (machine taken, unavailable…) is scoped to
  // this session only by default — the plan/target stay the source of
  // truth for future weeks unless the "aussi mettre à jour le programme"
  // checkbox was used. Derived once from the last set actually logged this
  // session (if any), so reopening/reloading mid-session doesn't forget a
  // substitution that already produced sets — before any set exists there's
  // nothing to derive from, so a fresh open/reload starts back at "planned".
  const [substituteExerciseId, setSubstituteExerciseId] = useState<string | null>(
    () => sortedSets[sortedSets.length - 1]?.exercise_id ?? null,
  )
  const substitutedExercise = substituteExerciseId
    ? exerciseById.get(substituteExerciseId)
    : undefined
  const effectiveExerciseId = substituteExerciseId ?? slot.exercise_id
  const displayName = substitutedExercise?.name ?? slot.exercise_name
  const displayImage = substitutedExercise?.image_url ?? slot.image_url
  const displayMuscleGroup = substitutedExercise?.muscle_group ?? slot.muscle_group

  async function handleSubstitute(exerciseId: string, alsoUpdateProgram: boolean) {
    // Picking the originally planned exercise back is a revert, not a
    // substitution — store null (″same as planned″) rather than an
    // explicit-but-redundant id.
    setSubstituteExerciseId(exerciseId === slot.exercise_id ? null : exerciseId)
    // The old target load doesn't transfer to a different exercise/machine
    // — carrying it over as a prefill would be actively misleading.
    setWeight('')
    if (alsoUpdateProgram) await onSubstituteProgram(slot.id, exerciseId)
  }

  function revertToPlanned() {
    setSubstituteExerciseId(null)
    setWeight(slot.target_weight_kg?.toString() ?? '')
  }

  function startRest(afterSetId: string) {
    setActiveRest({ key: afterSetId, seconds: restSeconds })
  }

  async function handleAddSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const created = await createSet.mutateAsync({
      session_template_exercise_id: slot.id,
      set_number: nextSetNumber,
      actual_reps: Number(reps),
      actual_weight_kg: Number(weight),
      actual_rpe: rpe.trim() === '' ? null : Number(rpe),
      exercise_id: substituteExerciseId,
    })
    // Charge/reps/RPE restent affichés tels quels après l'ajout : ils servent
    // de base pour la série suivante (surcharge progressive), plutôt que de
    // forcer à retaper la même charge à chaque série.
    startRest(created.id)
  }

  async function handleDuplicateSet(set: SessionLogSet) {
    const created = await createSet.mutateAsync({
      session_template_exercise_id: slot.id,
      set_number: nextSetNumber,
      actual_reps: set.actual_reps,
      actual_weight_kg: set.actual_weight_kg,
      actual_rpe: set.actual_rpe,
      // Duplicating a specific set duplicates it as whatever exercise it
      // actually was, not necessarily the card's currently active one.
      exercise_id: set.exercise_id,
    })
    setWeight(set.actual_weight_kg.toString())
    setReps(set.actual_reps.toString())
    setRpe(set.actual_rpe !== null ? set.actual_rpe.toString() : '')
    startRest(created.id)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ExerciseThumbnail imageUrl={displayImage} muscleGroup={displayMuscleGroup} />
          <CardTitle as="h3">{displayName}</CardTitle>
          {slot.is_unilateral && <Badge variant="outline">Unilatéral</Badge>}
        </div>
        {substituteExerciseId && (
          <p className="text-xs text-muted-foreground">
            Remplace {slot.exercise_name} pour cette séance
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Cible : {slot.target_sets} x {slot.target_reps_min}-{slot.target_reps_max}
          {slot.target_rpe !== null ? ` @ RPE ${slot.target_rpe}` : ''}
          {!substituteExerciseId && slot.target_weight_kg !== null
            ? ` · ${slot.target_weight_kg} kg`
            : ''}{' '}
          · repos {restSeconds}s
        </p>
        {!disabled && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <SubstituteExerciseDialog
              trigger={
                <Button type="button" variant="outline" size="sm">
                  <ArrowLeftRight /> Remplacer l'exercice
                </Button>
              }
              exercises={exercises}
              currentExerciseId={effectiveExerciseId}
              onCreateExercise={onCreateExercise}
              onSubstitute={handleSubstitute}
            />
            {substituteExerciseId && (
              <Button type="button" variant="ghost" size="sm" onClick={revertToPlanned}>
                Revenir à {slot.exercise_name}
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sortedSets.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {sortedSets.map((set) => {
              const setExerciseId = set.exercise_id ?? slot.exercise_id
              const setExerciseName =
                setExerciseId === slot.exercise_id
                  ? slot.exercise_name
                  : (exerciseById.get(setExerciseId)?.name ?? slot.exercise_name)
              const showsDifferentExercise = setExerciseId !== effectiveExerciseId
              return (
              <li
                key={set.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
              >
                <p className="font-mono tabular-nums">
                  Série {set.set_number} · {set.actual_weight_kg} kg x {set.actual_reps}
                  {set.actual_rpe !== null ? ` @ RPE ${set.actual_rpe}` : ''}
                  {showsDifferentExercise ? ` · ${setExerciseName}` : ''}
                </p>
                {!disabled && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Dupliquer cette série"
                      disabled={createSet.isPending}
                      onClick={() => void handleDuplicateSet(set)}
                    >
                      <Copy />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Supprimer cette série"
                      onClick={() => deleteSet.mutate(set.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </li>
              )
            })}
          </ul>
        )}

        {!disabled && activeRest && (
          <RestTimer
            key={activeRest.key}
            setId={activeRest.key}
            initialSeconds={activeRest.seconds}
            onDismiss={() => setActiveRest(null)}
          />
        )}

        {!disabled && (
          <div className="flex flex-wrap items-center gap-2">
            <PlateCalculatorDialog
              trigger={
                <Button type="button" variant="outline" size="sm">
                  <Calculator /> Calculateur de plaques
                </Button>
              }
              initialTargetWeightKg={weight.trim() !== '' ? Number(weight) : undefined}
            />
            {voiceInput.isSupported && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  voiceInput.isListening
                    ? voiceInput.stopListening()
                    : voiceInput.startListening()
                }
              >
                {voiceInput.isListening ? (
                  <>
                    <MicOff /> Arrêter l'écoute
                  </>
                ) : (
                  <>
                    <Mic /> Dicter la série
                  </>
                )}
              </Button>
            )}
          </div>
        )}
        {!disabled && voiceInput.error && (
          <p role="alert" className="text-sm text-destructive">
            {voiceInput.error}
          </p>
        )}

        {!disabled && (
          <form
            onSubmit={(event) => void handleAddSet(event)}
            className="grid grid-cols-3 items-end gap-2"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor={`weight-${slot.id}`}>Charge (kg)</Label>
              <Input
                id={`weight-${slot.id}`}
                type="number"
                min={0}
                step={0.5}
                required
                className="h-12 text-lg!"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`reps-${slot.id}`}>Reps</Label>
              <Input
                id={`reps-${slot.id}`}
                type="number"
                min={0}
                required
                className="h-12 text-lg!"
                value={reps}
                onChange={(event) => setReps(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`rpe-${slot.id}`}>RPE</Label>
              <Input
                id={`rpe-${slot.id}`}
                type="number"
                min={0}
                max={10}
                step={0.5}
                placeholder="Optionnel"
                className="h-12 text-lg!"
                value={rpe}
                onChange={(event) => setRpe(event.target.value)}
              />
            </div>
            <div className="col-span-3">
              <Button
                type="submit"
                size="lg"
                disabled={createSet.isPending}
                className="h-12! w-full"
              >
                <Plus /> Série {nextSetNumber}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
