import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Pause, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  useBreathProtocols,
  useCreateBreathProtocol,
  useDeleteBreathProtocol,
  useLogBreathSession,
  useUpdateBreathProtocol,
} from '@/hooks/useBreathProtocols'
import { formatTime, playBeep, vibrate } from '@/lib/timer-feedback'
import type { BreathProtocol, BreathProtocolInput } from '@/lib/breath-api'

export function BreathPage() {
  const { data: protocols, isLoading } = useBreathProtocols()
  const [running, setRunning] = useState<BreathProtocol | null>(null)

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Hypoxie intermittente</h1>

      <CreateProtocolCard />
      <ProtocolsListCard protocols={protocols ?? []} onLaunch={setRunning} />

      {running && (
        <BreathRunner protocol={running} onClose={() => setRunning(null)} />
      )}
    </div>
  )
}

function ProtocolFields({
  name,
  setName,
  holdSeconds,
  setHoldSeconds,
  recoverySeconds,
  setRecoverySeconds,
  cycles,
  setCycles,
  idPrefix,
}: {
  name: string
  setName: (name: string) => void
  holdSeconds: string
  setHoldSeconds: (value: string) => void
  recoverySeconds: string
  setRecoverySeconds: (value: string) => void
  cycles: string
  setCycles: (value: string) => void
  idPrefix: string
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Nom</Label>
        <Input
          id={`${idPrefix}-name`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Table CO2, Wim Hof…"
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-hold`}>Apnée (s)</Label>
          <Input
            id={`${idPrefix}-hold`}
            type="number"
            min={1}
            value={holdSeconds}
            onChange={(event) => setHoldSeconds(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-recovery`}>Récup (s)</Label>
          <Input
            id={`${idPrefix}-recovery`}
            type="number"
            min={1}
            value={recoverySeconds}
            onChange={(event) => setRecoverySeconds(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-cycles`}>Cycles</Label>
          <Input
            id={`${idPrefix}-cycles`}
            type="number"
            min={1}
            value={cycles}
            onChange={(event) => setCycles(event.target.value)}
            required
          />
        </div>
      </div>
    </>
  )
}

function CreateProtocolCard() {
  const createProtocol = useCreateBreathProtocol()
  const [name, setName] = useState('')
  const [holdSeconds, setHoldSeconds] = useState('')
  const [recoverySeconds, setRecoverySeconds] = useState('')
  const [cycles, setCycles] = useState('')

  const isValid =
    name.trim() !== '' &&
    Number(holdSeconds) > 0 &&
    Number(recoverySeconds) > 0 &&
    Number(cycles) > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid) return
    const input: BreathProtocolInput = {
      name: name.trim(),
      hold_seconds: Number(holdSeconds),
      recovery_seconds: Number(recoverySeconds),
      cycles: Number(cycles),
    }
    await createProtocol.mutateAsync(input)
    setName('')
    setHoldSeconds('')
    setRecoverySeconds('')
    setCycles('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Ajouter un protocole</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4"
        >
          <ProtocolFields
            idPrefix="create"
            name={name}
            setName={setName}
            holdSeconds={holdSeconds}
            setHoldSeconds={setHoldSeconds}
            recoverySeconds={recoverySeconds}
            setRecoverySeconds={setRecoverySeconds}
            cycles={cycles}
            setCycles={setCycles}
          />
          {createProtocol.isError && (
            <p role="alert" className="text-sm text-destructive">
              Impossible d'ajouter ce protocole.
            </p>
          )}
          <Button
            type="submit"
            className="self-start"
            disabled={createProtocol.isPending || !isValid}
          >
            {createProtocol.isPending ? 'Ajout…' : 'Ajouter'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ProtocolsListCard({
  protocols,
  onLaunch,
}: {
  protocols: BreathProtocol[]
  onLaunch: (protocol: BreathProtocol) => void
}) {
  const deleteProtocol = useDeleteBreathProtocol()
  const [editing, setEditing] = useState<BreathProtocol | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Mes protocoles</CardTitle>
      </CardHeader>
      <CardContent>
        {protocols.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun protocole pour l'instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {protocols.map((protocol) => (
              <li
                key={protocol.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border p-3"
              >
                <div>
                  <p className="font-medium">{protocol.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Apnée {protocol.hold_seconds}s · Récup {protocol.recovery_seconds}s ·{' '}
                    {protocol.cycles} cycles
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" size="sm" onClick={() => onLaunch(protocol)}>
                    Lancer
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(protocol)}
                  >
                    Modifier
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Supprimer ${protocol.name}`}
                      >
                        <Trash2 />
                      </Button>
                    }
                    title={`Supprimer "${protocol.name}" ?`}
                    description="Cette action est irréversible et supprimera aussi son historique."
                    confirmLabel="Supprimer"
                    onConfirm={async () => {
                      await deleteProtocol.mutateAsync(protocol.id)
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {editing && (
        <EditProtocolDialog protocol={editing} onClose={() => setEditing(null)} />
      )}
    </Card>
  )
}

function EditProtocolDialog({
  protocol,
  onClose,
}: {
  protocol: BreathProtocol
  onClose: () => void
}) {
  const updateProtocol = useUpdateBreathProtocol()
  const [name, setName] = useState(protocol.name)
  const [holdSeconds, setHoldSeconds] = useState(String(protocol.hold_seconds))
  const [recoverySeconds, setRecoverySeconds] = useState(String(protocol.recovery_seconds))
  const [cycles, setCycles] = useState(String(protocol.cycles))

  const isValid =
    name.trim() !== '' &&
    Number(holdSeconds) > 0 &&
    Number(recoverySeconds) > 0 &&
    Number(cycles) > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid) return
    await updateProtocol.mutateAsync({
      id: protocol.id,
      patch: {
        name: name.trim(),
        hold_seconds: Number(holdSeconds),
        recovery_seconds: Number(recoverySeconds),
        cycles: Number(cycles),
      },
    })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier "{protocol.name}"</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4"
        >
          <ProtocolFields
            idPrefix="edit"
            name={name}
            setName={setName}
            holdSeconds={holdSeconds}
            setHoldSeconds={setHoldSeconds}
            recoverySeconds={recoverySeconds}
            setRecoverySeconds={setRecoverySeconds}
            cycles={cycles}
            setCycles={setCycles}
          />
          {updateProtocol.isError && (
            <p role="alert" className="text-sm text-destructive">
              Impossible d'enregistrer les modifications.
            </p>
          )}
          <Button type="submit" disabled={updateProtocol.isPending || !isValid}>
            {updateProtocol.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type Phase = 'hold' | 'recovery' | 'done'

interface RunnerState {
  phase: Phase
  cycleIndex: number
  secondsLeft: number
}

function initialRunnerState(protocol: BreathProtocol): RunnerState {
  return { phase: 'hold', cycleIndex: 1, secondsLeft: protocol.hold_seconds }
}

// A cycle counts as "completed" once its apnea phase has finished —
// recovery is just the gap before the next hold, not itself the work.
function advance(state: RunnerState, protocol: BreathProtocol): RunnerState {
  if (state.phase === 'hold') {
    return { phase: 'recovery', cycleIndex: state.cycleIndex, secondsLeft: protocol.recovery_seconds }
  }
  if (state.cycleIndex >= protocol.cycles) {
    return { phase: 'done', cycleIndex: state.cycleIndex, secondsLeft: 0 }
  }
  return { phase: 'hold', cycleIndex: state.cycleIndex + 1, secondsLeft: protocol.hold_seconds }
}

function completedCyclesFor(state: RunnerState): number {
  return state.phase === 'hold' ? state.cycleIndex - 1 : state.cycleIndex
}

function BreathRunner({
  protocol,
  onClose,
}: {
  protocol: BreathProtocol
  onClose: () => void
}) {
  const [state, setState] = useState<RunnerState>(() => initialRunnerState(protocol))
  const [paused, setPaused] = useState(false)
  const startedAtRef = useRef(new Date().toISOString())
  const hasFiredRef = useRef(false)
  const hasLoggedRef = useRef(false)
  const logSession = useLogBreathSession()

  useEffect(() => {
    if (paused || state.phase === 'done') return
    if (state.secondsLeft <= 0) {
      if (hasFiredRef.current) return
      hasFiredRef.current = true
      vibrate(state.phase === 'hold' ? [200] : [150, 80, 150, 80, 150])
      playBeep()
      setState((prev) => advance(prev, protocol))
      return
    }
    hasFiredRef.current = false
    const timeout = setTimeout(() => {
      setState((prev) => ({ ...prev, secondsLeft: prev.secondsLeft - 1 }))
    }, 1000)
    return () => clearTimeout(timeout)
  }, [state, paused, protocol])

  useEffect(() => {
    if (state.phase !== 'done' || hasLoggedRef.current) return
    hasLoggedRef.current = true
    logSession.mutate({
      protocol_id: protocol.id,
      completed_cycles: protocol.cycles,
      started_at: startedAtRef.current,
    })
  }, [state.phase, protocol, logSession])

  function skip() {
    if (state.phase === 'done') return
    setState((prev) => advance(prev, protocol))
  }

  function stop() {
    const completed = completedCyclesFor(state)
    if (completed > 0 && !hasLoggedRef.current) {
      hasLoggedRef.current = true
      logSession.mutate({
        protocol_id: protocol.id,
        completed_cycles: completed,
        started_at: startedAtRef.current,
      })
    }
    onClose()
  }

  if (state.phase === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background p-6 text-center">
        <p className="text-2xl font-semibold">Protocole terminé 🎉</p>
        <p className="text-muted-foreground">
          {protocol.cycles} cycles complétés — {protocol.name}
        </p>
        <Button type="button" size="lg" onClick={onClose}>
          Fermer
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background p-6 text-center">
      <div>
        <p className="text-sm text-muted-foreground">{protocol.name}</p>
        <p className="mt-1 text-lg font-medium">
          Cycle {state.cycleIndex}/{protocol.cycles}
        </p>
      </div>
      <p className="text-3xl font-semibold">
        {state.phase === 'hold' ? 'Apnée' : 'Récupération'}
      </p>
      <p className="font-mono text-7xl font-bold tabular-nums">
        {formatTime(state.secondsLeft)}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12!"
          onClick={() => setPaused((prev) => !prev)}
        >
          {paused ? <Play /> : <Pause />}
          {paused ? 'Reprendre' : 'Pause'}
        </Button>
        <Button type="button" variant="outline" size="lg" className="h-12!" onClick={skip}>
          Passer
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="h-12!"
          onClick={stop}
        >
          Arrêter
        </Button>
      </div>
    </div>
  )
}
