import { type FormEvent, useEffect, useState } from 'react'
import { ChevronLeft, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ExercisePicker, NEW_EXERCISE_VALUE } from '@/components/ExercisePicker'
import { parseLocaleNumber } from '@/lib/number-input'
import { nextSupersetLabel } from '@/lib/ordering'
import type { Exercise } from '@/lib/exercises-api'
import type { ProgramFocus } from '@/lib/programs-api'
import { DEFAULT_REST_SECONDS_BY_FOCUS } from '@/lib/sessions-api'
import type { SessionTemplateExerciseInput } from '@/lib/sessions-api'

const FORM_ID = 'exercise-slot-form'

type Step = 'pick' | 'configure'

interface ExerciseSlotFlowProps {
  trigger: React.ReactNode
  exercises: Exercise[]
  focus: ProgramFocus
  initialValue?: SessionTemplateExerciseInput
  submitLabel: string
  onCreateExercise: (input: {
    name: string
    muscle_group: string | null
  }) => Promise<Exercise>
  onSubmit: (input: SessionTemplateExerciseInput) => Promise<void>
  // Enables "select several exercises → configure each → create them all as
  // one superset" on the picker step, in addition to the normal single-add
  // path. Only meaningful for adding (never passed alongside initialValue).
  existingSupersetGroups?: (string | null)[]
  onSubmitSuperset?: (inputs: SessionTemplateExerciseInput[]) => Promise<void>
}

const DEFAULT_TARGET_SETS = 3
const DEFAULT_TARGET_REPS_MIN = 8
const DEFAULT_TARGET_REPS_MAX = 12

export function ExerciseSlotFlow({
  trigger,
  exercises,
  focus,
  initialValue,
  submitLabel,
  onCreateExercise,
  onSubmit,
  existingSupersetGroups,
  onSubmitSuperset,
}: ExerciseSlotFlowProps) {
  const defaultRestSeconds = DEFAULT_REST_SECONDS_BY_FOCUS[focus]
  // Editing an existing slot skips straight to the settings screen — no
  // need to re-pick an exercise just to tweak sets/reps. Adding a new one
  // always starts on the picker. Either way, this is the step the back
  // button returns to before closing the whole flow.
  const entryStep: Step = initialValue ? 'configure' : 'pick'
  const canCreateSuperset = Boolean(onSubmitSuperset) && !initialValue

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>(entryStep)
  const [exerciseId, setExerciseId] = useState(initialValue?.exercise_id ?? '')
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] = useState('')
  const [targetSets, setTargetSets] = useState(initialValue?.target_sets ?? DEFAULT_TARGET_SETS)
  const [targetRepsMin, setTargetRepsMin] = useState(
    initialValue?.target_reps_min ?? DEFAULT_TARGET_REPS_MIN,
  )
  const [targetRepsMax, setTargetRepsMax] = useState(
    initialValue?.target_reps_max ?? DEFAULT_TARGET_REPS_MAX,
  )
  const [targetRpe, setTargetRpe] = useState(initialValue?.target_rpe?.toString() ?? '')
  const [targetRestSeconds, setTargetRestSeconds] = useState(
    initialValue?.target_rest_seconds?.toString() ?? '',
  )
  const [targetWeightKg, setTargetWeightKg] = useState(
    initialValue?.target_weight_kg?.toString() ?? '',
  )
  const [notes, setNotes] = useState(initialValue?.notes ?? '')
  const [isUnilateral, setIsUnilateral] = useState(initialValue?.is_unilateral ?? false)
  const [isBodyweight, setIsBodyweight] = useState(initialValue?.is_bodyweight ?? false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Multi-exercise "create a superset" path — only reachable from the
  // picker step when canCreateSuperset is true.
  const [multiMode, setMultiMode] = useState(false)
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([])
  const [supersetLabel, setSupersetLabel] = useState('')
  const [supersetIndex, setSupersetIndex] = useState(0)
  const [supersetQueue, setSupersetQueue] = useState<SessionTemplateExerciseInput[]>([])
  const isMultiConfigure = step === 'configure' && multiSelectedIds.length > 0

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step])

  function resetConfigureFields() {
    setExerciseId('')
    setNewExerciseName('')
    setNewExerciseMuscleGroup('')
    setTargetSets(DEFAULT_TARGET_SETS)
    setTargetRepsMin(DEFAULT_TARGET_REPS_MIN)
    setTargetRepsMax(DEFAULT_TARGET_REPS_MAX)
    setTargetRpe('')
    setTargetRestSeconds('')
    setTargetWeightKg('')
    setNotes('')
    setIsUnilateral(false)
    setIsBodyweight(false)
  }

  function openFlow() {
    // Only the "add" instance is a single long-lived component reused
    // across every open — without this reset, its fields stay stuck on
    // whatever was last entered instead of starting blank next time.
    // "Edit" instances are scoped to one slot each, so no reset needed.
    if (!initialValue) {
      resetConfigureFields()
      setMultiMode(false)
      setMultiSelectedIds([])
      setSupersetQueue([])
      setSupersetIndex(0)
    }
    setStep(entryStep)
    setOpen(true)
  }

  function close() {
    setOpen(false)
  }

  function handleBack() {
    if (step === entryStep) {
      close()
      return
    }
    // Mid-superset-configuration back goes to the picker rather than
    // stepping through each already-configured exercise in reverse — a
    // deliberate simplification. Selections stay intact, so continuing is
    // one tap away; only the per-exercise fields already filled in are lost.
    if (isMultiConfigure) {
      setSupersetQueue([])
      setSupersetIndex(0)
    }
    setStep(entryStep)
  }

  function toggleMultiSelected(id: string) {
    setMultiSelectedIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id],
    )
  }

  function continueToSupersetConfigure() {
    if (multiSelectedIds.length < 2) return
    setSupersetLabel(nextSupersetLabel(existingSupersetGroups ?? []))
    setSupersetQueue([])
    setSupersetIndex(0)
    resetConfigureFields()
    setExerciseId(multiSelectedIds[0]!)
    setStep('configure')
  }

  function handlePick(id: string) {
    setExerciseId(id)
    setStep('configure')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      let resolvedExerciseId = exerciseId
      if (exerciseId === NEW_EXERCISE_VALUE) {
        const created = await onCreateExercise({
          name: newExerciseName,
          muscle_group:
            newExerciseMuscleGroup.trim() === '' ? null : newExerciseMuscleGroup,
        })
        resolvedExerciseId = created.id
      }

      const input: SessionTemplateExerciseInput = {
        exercise_id: resolvedExerciseId,
        target_sets: targetSets,
        target_reps_min: targetRepsMin,
        target_reps_max: targetRepsMax,
        target_rpe: targetRpe.trim() === '' ? null : parseLocaleNumber(targetRpe),
        target_rest_seconds:
          targetRestSeconds.trim() === '' ? null : Number(targetRestSeconds),
        target_weight_kg:
          targetWeightKg.trim() === '' ? null : parseLocaleNumber(targetWeightKg),
        notes: notes.trim() === '' ? null : notes,
        // The manual free-text field this used to be is gone (typo-prone,
        // easy to silently break a grouping) — a plain add/edit always
        // preserves whatever group the slot already belonged to, and the
        // only ways to change membership now are the superset picker below
        // and the dedicated link/unlink actions on each slot.
        superset_group: isMultiConfigure ? supersetLabel : (initialValue?.superset_group ?? null),
        is_unilateral: isUnilateral,
        is_bodyweight: isBodyweight,
      }

      if (isMultiConfigure) {
        const queue = [...supersetQueue, input]
        const nextIndex = supersetIndex + 1
        if (nextIndex < multiSelectedIds.length) {
          setSupersetQueue(queue)
          setSupersetIndex(nextIndex)
          resetConfigureFields()
          setExerciseId(multiSelectedIds[nextIndex]!)
        } else {
          await onSubmitSuperset!(queue)
          close()
        }
      } else {
        await onSubmit(input)
        close()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedExercise = exercises.find((exercise) => exercise.id === exerciseId)
  const isNewExercise = exerciseId === NEW_EXERCISE_VALUE
  const headerTitle =
    step === 'pick'
      ? multiMode
        ? 'Choisir les exercices du superset'
        : 'Choisir un exercice'
      : isMultiConfigure
        ? `Superset ${supersetLabel} · ${supersetIndex + 1}/${multiSelectedIds.length} · ${selectedExercise?.name ?? ''}`
        : ((isNewExercise ? 'Nouvel exercice' : selectedExercise?.name) ?? submitLabel)
  const canChangeExercise = Boolean(initialValue) && step === 'configure'
  const configureSubmitLabel = isMultiConfigure
    ? supersetIndex + 1 < multiSelectedIds.length
      ? 'Exercice suivant'
      : `Créer le superset (${multiSelectedIds.length} exercices)`
    : submitLabel

  return (
    <>
      <span onClick={openFlow}>{trigger}</span>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={headerTitle}
          className="fixed inset-0 z-50 flex flex-col overflow-x-hidden bg-background"
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-border p-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Retour"
              onClick={handleBack}
            >
              <ChevronLeft />
            </Button>
            <h2 className="min-w-0 flex-1 truncate font-heading text-base font-medium">
              {headerTitle}
            </h2>
          </header>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
            {step === 'pick' ? (
              <div className="flex h-full min-h-0 flex-col gap-3">
                {canCreateSuperset && (
                  <Button
                    type="button"
                    variant={multiMode ? 'default' : 'outline'}
                    size="sm"
                    className="self-start"
                    onClick={() => {
                      setMultiMode(!multiMode)
                      setMultiSelectedIds([])
                    }}
                  >
                    <Layers />
                    {multiMode ? 'Annuler la sélection multiple' : 'Créer un superset'}
                  </Button>
                )}
                <div className="min-h-0 flex-1">
                  <ExercisePicker
                    exercises={exercises}
                    value={exerciseId}
                    onSelect={handlePick}
                    multiSelect={
                      multiMode
                        ? { selectedIds: multiSelectedIds, onToggle: toggleMultiSelected }
                        : undefined
                    }
                  />
                </div>
              </div>
            ) : (
              <form
                id={FORM_ID}
                onSubmit={(event) => void handleSubmit(event)}
                className="flex flex-col gap-4"
              >
                {canChangeExercise && (
                  <button
                    type="button"
                    onClick={() => setStep('pick')}
                    className="self-start text-sm text-muted-foreground underline underline-offset-2"
                  >
                    Changer d'exercice
                  </button>
                )}

                {isNewExercise && (
                  <div className="flex flex-col gap-4 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-exercise-name">Nom du nouvel exercice</Label>
                      <Input
                        id="new-exercise-name"
                        required
                        value={newExerciseName}
                        onChange={(event) => setNewExerciseName(event.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-exercise-muscle-group">Groupe musculaire</Label>
                      <Input
                        id="new-exercise-muscle-group"
                        placeholder="Optionnel"
                        value={newExerciseMuscleGroup}
                        onChange={(event) => setNewExerciseMuscleGroup(event.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="target-sets">Séries</Label>
                    <Input
                      id="target-sets"
                      type="number"
                      min={1}
                      required
                      className="w-16"
                      value={targetSets}
                      onChange={(event) => setTargetSets(Number(event.target.value))}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Label>Reps</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        required
                        aria-label="Reps min"
                        value={targetRepsMin}
                        onChange={(event) => setTargetRepsMin(Number(event.target.value))}
                      />
                      <span className="shrink-0 text-sm text-muted-foreground">à</span>
                      <Input
                        type="number"
                        min={1}
                        required
                        aria-label="Reps max"
                        value={targetRepsMax}
                        onChange={(event) => setTargetRepsMax(Number(event.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <details className="group rounded-lg border border-border p-3">
                  <summary className="cursor-pointer select-none font-medium">
                    Options avancées
                  </summary>
                  <div className="mt-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="target-weight-kg">
                        {isBodyweight ? 'Charge additionnelle (kg)' : 'Charge de base visée (kg)'}
                      </Label>
                      <Input
                        id="target-weight-kg"
                        type="text"
                        inputMode="decimal"
                        placeholder="Optionnel"
                        value={targetWeightKg}
                        onChange={(event) => setTargetWeightKg(event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {isBodyweight
                          ? 'Lest ajouté (ex : +5) ou assistance retirée (ex : -10) par rapport au poids du corps seul. Laisser vide pour poids du corps seul.'
                          : 'Poids de référence à atteindre sur cet exercice : pré-remplit la première série en séance et sert de repère de surcharge progressive (aussi utilisé par le Coach IA).'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="target-rpe">RPE cible</Label>
                      <Input
                        id="target-rpe"
                        type="text"
                        inputMode="decimal"
                        placeholder="Optionnel"
                        value={targetRpe}
                        onChange={(event) => setTargetRpe(event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        RPE = difficulté ressentie, de 0 à 10. 10 = effort maximal
                        (impossible de faire une répétition de plus), 7-8 = encore 2-3
                        répétitions en réserve.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="target-rest-seconds">Repos (secondes)</Label>
                      <Input
                        id="target-rest-seconds"
                        type="number"
                        min={1}
                        placeholder={`Optionnel · ${defaultRestSeconds}s par défaut`}
                        value={targetRestSeconds}
                        onChange={(event) => setTargetRestSeconds(event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Le repos de base dépend du focus du programme : plus long en force
                        (charges proches du max), plus court en endurance (stress
                        métabolique).
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="exercise-notes">Notes</Label>
                      <Textarea
                        id="exercise-notes"
                        placeholder="Optionnel"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          id="is-unilateral"
                          type="checkbox"
                          checked={isUnilateral}
                          onChange={(event) => setIsUnilateral(event.target.checked)}
                          className="size-4 rounded border-input accent-primary"
                        />
                        <Label htmlFor="is-unilateral">Unilatéral</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Un côté à la fois (ex : tirage vertical câble en unilatéral), affiché
                        comme repère pendant la séance.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          id="is-bodyweight"
                          type="checkbox"
                          checked={isBodyweight}
                          onChange={(event) => setIsBodyweight(event.target.checked)}
                          className="size-4 rounded border-input accent-primary"
                        />
                        <Label htmlFor="is-bodyweight">Poids du corps</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pas de charge externe requise (ex : abdos, pompes, tractions) : la
                        saisie en séance devient une charge additionnelle facultative
                        (lest ou assistance) plutôt qu'une charge totale.
                      </p>
                    </div>
                  </div>
                </details>
              </form>
            )}
          </div>

          {step === 'pick' && multiMode && (
            <div className="shrink-0 border-t border-border bg-background p-3">
              <Button
                type="button"
                className="w-full"
                disabled={multiSelectedIds.length < 2}
                onClick={continueToSupersetConfigure}
              >
                {multiSelectedIds.length < 2
                  ? 'Sélectionne au moins 2 exercices'
                  : `Continuer avec ${multiSelectedIds.length} exercices`}
              </Button>
            </div>
          )}

          {step === 'configure' && (
            <div className="shrink-0 border-t border-border bg-background p-3">
              <Button
                type="submit"
                form={FORM_ID}
                className="w-full"
                disabled={
                  isSubmitting ||
                  exerciseId === '' ||
                  (isNewExercise && newExerciseName.trim() === '')
                }
              >
                {isSubmitting ? 'Enregistrement…' : configureSubmitLabel}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
