import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ExercisePicker, NEW_EXERCISE_VALUE } from '@/components/ExercisePicker'
import type { Exercise } from '@/lib/exercises-api'
import type { ProgramFocus } from '@/lib/programs-api'
import { DEFAULT_REST_SECONDS_BY_FOCUS } from '@/lib/sessions-api'
import type { SessionTemplateExerciseInput } from '@/lib/sessions-api'

interface ExerciseSlotFormDialogProps {
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
}

export function ExerciseSlotFormDialog({
  trigger,
  exercises,
  focus,
  initialValue,
  submitLabel,
  onCreateExercise,
  onSubmit,
}: ExerciseSlotFormDialogProps) {
  const defaultRestSeconds = DEFAULT_REST_SECONDS_BY_FOCUS[focus]
  const [open, setOpen] = useState(false)
  const [exerciseId, setExerciseId] = useState(initialValue?.exercise_id ?? '')
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] = useState('')
  const [targetSets, setTargetSets] = useState(initialValue?.target_sets ?? 3)
  const [targetRepsMin, setTargetRepsMin] = useState(initialValue?.target_reps_min ?? 8)
  const [targetRepsMax, setTargetRepsMax] = useState(initialValue?.target_reps_max ?? 12)
  const [targetRpe, setTargetRpe] = useState(initialValue?.target_rpe?.toString() ?? '')
  const [targetRestSeconds, setTargetRestSeconds] = useState(
    initialValue?.target_rest_seconds?.toString() ?? '',
  )
  const [notes, setNotes] = useState(initialValue?.notes ?? '')
  const [supersetGroup, setSupersetGroup] = useState(initialValue?.superset_group ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

      await onSubmit({
        exercise_id: resolvedExerciseId,
        target_sets: targetSets,
        target_reps_min: targetRepsMin,
        target_reps_max: targetRepsMax,
        target_rpe: targetRpe.trim() === '' ? null : Number(targetRpe),
        target_rest_seconds:
          targetRestSeconds.trim() === '' ? null : Number(targetRestSeconds),
        notes: notes.trim() === '' ? null : notes,
        superset_group: supersetGroup.trim() === '' ? null : supersetGroup.trim(),
      })
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{submitLabel}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label>Exercice</Label>
            <ExercisePicker
              exercises={exercises}
              value={exerciseId}
              onSelect={setExerciseId}
            />
          </div>

          {exerciseId === NEW_EXERCISE_VALUE && (
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

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="target-sets">Séries</Label>
              <Input
                id="target-sets"
                type="number"
                min={1}
                required
                value={targetSets}
                onChange={(event) => setTargetSets(Number(event.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="target-reps-min">Reps min</Label>
              <Input
                id="target-reps-min"
                type="number"
                min={1}
                required
                value={targetRepsMin}
                onChange={(event) => setTargetRepsMin(Number(event.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="target-reps-max">Reps max</Label>
              <Input
                id="target-reps-max"
                type="number"
                min={1}
                required
                value={targetRepsMax}
                onChange={(event) => setTargetRepsMax(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="target-rpe">RPE cible</Label>
            <Input
              id="target-rpe"
              type="number"
              min={0}
              max={10}
              step={0.5}
              placeholder="Optionnel"
              value={targetRpe}
              onChange={(event) => setTargetRpe(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              RPE = difficulté ressentie, de 0 à 10. 10 = effort maximal (impossible de
              faire une répétition de plus), 7-8 = encore 2-3 répétitions en réserve.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="target-rest-seconds">Repos (secondes)</Label>
            <Input
              id="target-rest-seconds"
              type="number"
              min={1}
              placeholder={`Optionnel — ${defaultRestSeconds}s par défaut`}
              value={targetRestSeconds}
              onChange={(event) => setTargetRestSeconds(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Le repos de base dépend du focus du programme : plus long en force (charges
              proches du max), plus court en endurance (stress métabolique).
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
            <Label htmlFor="superset-group">Superset</Label>
            <Input
              id="superset-group"
              placeholder="Optionnel — ex: A"
              value={supersetGroup}
              onChange={(event) => setSupersetGroup(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Donne le même repère (ex : "A") à plusieurs exercices du même jour pour les
              enchaîner en superset.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                exerciseId === '' ||
                (exerciseId === NEW_EXERCISE_VALUE && newExerciseName.trim() === '')
              }
            >
              {isSubmitting ? 'Enregistrement…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
