import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExercisePicker, NEW_EXERCISE_VALUE } from '@/components/ExercisePicker'
import type { Exercise } from '@/lib/exercises-api'

interface SubstituteExerciseDialogProps {
  trigger: React.ReactNode
  exercises: Exercise[]
  currentExerciseId: string
  onCreateExercise: (input: { name: string; muscle_group: string | null }) => Promise<Exercise>
  onSubstitute: (exerciseId: string, alsoUpdateProgram: boolean) => Promise<void>
}

// Same full-screen picker treatment as ExerciseSlotFlow's "pick" step, for
// the same reason: a searchable, muscle-group-filterable list works better
// full-screen on mobile than squeezed into a centered shadcn Dialog.
export function SubstituteExerciseDialog({
  trigger,
  exercises,
  currentExerciseId,
  onCreateExercise,
  onSubstitute,
}: SubstituteExerciseDialogProps) {
  const [open, setOpen] = useState(false)
  const [exerciseId, setExerciseId] = useState('')
  const [newName, setNewName] = useState('')
  const [newMuscleGroup, setNewMuscleGroup] = useState('')
  const [alsoUpdateProgram, setAlsoUpdateProgram] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function openFlow() {
    setExerciseId('')
    setNewName('')
    setNewMuscleGroup('')
    setAlsoUpdateProgram(false)
    setOpen(true)
  }

  async function commit(id: string) {
    setIsSubmitting(true)
    try {
      await onSubstitute(id, alsoUpdateProgram)
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreateAndSubstitute() {
    setIsSubmitting(true)
    try {
      const created = await onCreateExercise({
        name: newName,
        muscle_group: newMuscleGroup.trim() === '' ? null : newMuscleGroup,
      })
      await onSubstitute(created.id, alsoUpdateProgram)
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <span onClick={openFlow}>{trigger}</span>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Remplacer l'exercice"
          className="fixed inset-0 z-50 flex flex-col overflow-x-hidden bg-background"
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-border p-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Fermer"
              onClick={() =>
                exerciseId === NEW_EXERCISE_VALUE ? setExerciseId('') : setOpen(false)
              }
            >
              <ChevronLeft />
            </Button>
            <h2 className="min-w-0 flex-1 truncate font-heading text-base font-medium">
              {exerciseId === NEW_EXERCISE_VALUE ? 'Nouvel exercice' : "Remplacer l'exercice"}
            </h2>
          </header>

          <div className="flex shrink-0 flex-col gap-1 border-b border-border p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={alsoUpdateProgram}
                onChange={(event) => setAlsoUpdateProgram(event.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              Aussi mettre à jour le programme
            </label>
            <p className="pl-6 text-xs text-muted-foreground">
              {alsoUpdateProgram
                ? 'Les prochaines séances utiliseront aussi ce nouvel exercice.'
                : 'Juste pour cette séance, le programme ne change pas.'}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
            {exerciseId === NEW_EXERCISE_VALUE ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="substitute-new-name">Nom du nouvel exercice</Label>
                  <Input
                    id="substitute-new-name"
                    required
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="substitute-new-muscle-group">Groupe musculaire</Label>
                  <Input
                    id="substitute-new-muscle-group"
                    placeholder="Optionnel"
                    value={newMuscleGroup}
                    onChange={(event) => setNewMuscleGroup(event.target.value)}
                  />
                </div>
              </div>
            ) : (
              <ExercisePicker
                exercises={exercises}
                value={currentExerciseId}
                onSelect={(id) => (id === NEW_EXERCISE_VALUE ? setExerciseId(id) : void commit(id))}
              />
            )}
          </div>

          {exerciseId === NEW_EXERCISE_VALUE && (
            <div className="shrink-0 border-t border-border bg-background p-3">
              <Button
                type="button"
                className="w-full"
                disabled={isSubmitting || newName.trim() === ''}
                onClick={() => void handleCreateAndSubstitute()}
              >
                {isSubmitting ? 'Création…' : 'Utiliser cet exercice'}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
