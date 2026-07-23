import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Calculator, ChevronLeft, Copy, Mic, MicOff, Plus, Trash2, Wind } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { RestTimer } from '@/components/RestTimer'
import { PlateCalculatorDialog } from '@/components/PlateCalculatorDialog'
import {
  useCompleteSessionLog,
  useCreateSessionLogSet,
  useDeleteSessionLog,
  useDeleteSessionLogSet,
  useSessionLog,
  useSessionLogSets,
  useSessionPlan,
} from '@/hooks/useSessionLogs'
import { useVoiceSetInput } from '@/hooks/useVoiceSetInput'
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

  const sortedSlots = plan?.exercises ?? []
  const allSets = sets ?? []
  const isInProgress = log.status === 'in_progress'
  // Falls back to the hypertrophie default if the plan hasn't been cached
  // on this device yet and there's no network to fetch it right now.
  const focus: ProgramFocus = plan?.focus ?? 'hypertrophie'

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={`/programs/${log.program_id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Retour au programme
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {plan ? WEEKDAY_LABELS[plan.day_of_week] : 'Séance'}
          </h1>
          {plan && <p className="mt-1 text-muted-foreground">{plan.program_name}</p>}
          <Badge variant={isInProgress ? 'outline' : 'default'} className="mt-2">
            {isInProgress ? 'En cours' : 'Terminée'}
          </Badge>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link to="/apnee">
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
      </div>

      <ul className="flex flex-col gap-3">
        {sortedSlots.map((slot) => (
          <li key={slot.id}>
            <SessionLogExerciseCard
              slot={slot}
              sets={allSets.filter((set) => set.session_template_exercise_id === slot.id)}
              sessionLogId={log.id}
              focus={focus}
              disabled={!isInProgress}
            />
          </li>
        ))}
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
}: {
  slot: CachedPlanExercise
  sets: SessionLogSet[]
  sessionLogId: string
  focus: ProgramFocus
  disabled: boolean
}) {
  const createSet = useCreateSessionLogSet(sessionLogId)
  const deleteSet = useDeleteSessionLogSet()
  const [weight, setWeight] = useState('')
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
    })
    setWeight('')
    setRpe('')
    startRest(created.id)
  }

  async function handleDuplicateSet(set: SessionLogSet) {
    const created = await createSet.mutateAsync({
      session_template_exercise_id: slot.id,
      set_number: nextSetNumber,
      actual_reps: set.actual_reps,
      actual_weight_kg: set.actual_weight_kg,
      actual_rpe: set.actual_rpe,
    })
    startRest(created.id)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle as="h3">{slot.exercise_name}</CardTitle>
          {slot.superset_group && (
            <Badge variant="outline">Superset {slot.superset_group}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Cible : {slot.target_sets} x {slot.target_reps_min}-{slot.target_reps_max}
          {slot.target_rpe !== null ? ` @ RPE ${slot.target_rpe}` : ''} · repos{' '}
          {restSeconds}s
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sortedSets.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {sortedSets.map((set) => (
              <li
                key={set.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
              >
                <p className="font-mono tabular-nums">
                  Série {set.set_number} — {set.actual_weight_kg} kg x {set.actual_reps}
                  {set.actual_rpe !== null ? ` @ RPE ${set.actual_rpe}` : ''}
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
            ))}
          </ul>
        )}

        {!disabled && activeRest && (
          <RestTimer
            key={activeRest.key}
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
