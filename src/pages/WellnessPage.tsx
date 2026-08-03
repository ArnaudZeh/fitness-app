import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Pause, Play, Trash2, Wind } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { NotificationsCard } from '@/components/NotificationsCard'
import {
  useCreateWellnessActivity,
  useDeleteWellnessActivity,
  useLogWellnessActivity,
  useUnlogWellnessActivity,
  useUpdateWellnessActivity,
  useWellnessActivities,
  useWellnessActivityLogs,
} from '@/hooks/useWellnessActivities'
import {
  useBreathProtocols,
  useCreateBreathProtocol,
  useDeleteBreathProtocol,
  useLogBreathSession,
  useUpdateBreathProtocol,
} from '@/hooks/useBreathProtocols'
import { formatTime, playBeep, vibrate } from '@/lib/timer-feedback'
import { WEEKDAY_LABELS, getTodayIsoDayOfWeek } from '@/lib/sessions-api'
import type { WellnessActivity, WellnessActivityInput } from '@/lib/wellness-api'
import type { BreathProtocol, BreathProtocolInput } from '@/lib/breath-api'

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const

// Every lookup here uses a key from WEEKDAYS (always 1-7) — non-null by
// construction, safe to assert rather than guard for a lookup that can't
// actually miss.
function weekdayLabel(day: number): string {
  return WEEKDAY_LABELS[day]!
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

type WeekDates = [string, string, string, string, string, string, string]

// Local time, deliberately — this is "what day is it for the user right
// now", the same concern as the dashboard's "Aujourd'hui" card, not the
// UTC bucketing used for historical Analytics data (different concern,
// see the note in HomePage.tsx).
function getCurrentWeekDates(now: Date = new Date()): WeekDates {
  const isoDay = getTodayIsoDayOfWeek(now)
  const monday = new Date(now)
  monday.setDate(monday.getDate() - (isoDay - 1))
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return toLocalDateString(date)
  })
  return dates as WeekDates
}

type View = 'day' | 'week'

export function WellnessPage() {
  const [view, setView] = useState<View>('day')
  const { data: activities, isLoading: activitiesLoading } = useWellnessActivities()
  const { data: protocols, isLoading: protocolsLoading } = useBreathProtocols()
  const [running, setRunning] = useState<BreathProtocol | null>(null)

  const todayIsoDayOfWeek = getTodayIsoDayOfWeek()
  const todayDate = toLocalDateString(new Date())
  const weekDates = getCurrentWeekDates()
  const { data: logs } = useWellnessActivityLogs(weekDates[0], weekDates[6])

  if (activitiesLoading || protocolsLoading) {
    return <p className="text-muted-foreground">Chargement…</p>
  }

  const allActivities = activities ?? []
  const activeActivities = allActivities.filter((a) => a.active)
  const allProtocols = protocols ?? []
  const loggedDates = new Set(
    (logs ?? []).map((l) => `${l.activity_id}:${l.completed_date}`),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Bien-être</h1>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {(['day', 'week'] as const).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={view === option ? 'default' : 'ghost'}
              onClick={() => setView(option)}
            >
              {option === 'day' ? 'Jour' : 'Semaine'}
            </Button>
          ))}
        </div>
      </div>

      {/* Protocols have no day/time schedule (launched on demand), so this
          scheduled-today/this-week view is scoped to recurring activities
          only — merging them into "Mes exercices" below doesn't mean
          pretending a protocol has a day it's "due". */}
      {view === 'day' ? (
        <DayView
          activities={activeActivities}
          todayIsoDayOfWeek={todayIsoDayOfWeek}
          todayDate={todayDate}
          loggedDates={loggedDates}
        />
      ) : (
        <WeekView
          activities={activeActivities}
          weekDates={weekDates}
          loggedDates={loggedDates}
        />
      )}

      <NotificationsCard />
      <CreateExerciseCard />
      <ExercisesListCard
        activities={allActivities}
        protocols={allProtocols}
        onLaunch={setRunning}
      />

      {running && <BreathRunner protocol={running} onClose={() => setRunning(null)} />}
    </div>
  )
}

function DayView({
  activities,
  todayIsoDayOfWeek,
  todayDate,
  loggedDates,
}: {
  activities: WellnessActivity[]
  todayIsoDayOfWeek: number
  todayDate: string
  loggedDates: Set<string>
}) {
  const logActivity = useLogWellnessActivity()
  const unlogActivity = useUnlogWellnessActivity()
  const todaysActivities = activities.filter((a) =>
    a.days_of_week.includes(todayIsoDayOfWeek),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Aujourd'hui · {weekdayLabel(todayIsoDayOfWeek)}</CardTitle>
      </CardHeader>
      <CardContent>
        {todaysActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune activité programmée aujourd'hui.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todaysActivities.map((activity) => {
              const isDone = loggedDates.has(`${activity.id}:${todayDate}`)
              const isPending = logActivity.isPending || unlogActivity.isPending
              return (
                <li
                  key={activity.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
                >
                  <div>
                    <p className="text-sm font-medium">{activity.name}</p>
                    {activity.reminder_time && (
                      <p className="text-xs text-muted-foreground">
                        Rappel à {activity.reminder_time.slice(0, 5)}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={isDone ? 'default' : 'outline'}
                    disabled={isPending}
                    onClick={() => {
                      if (isDone) {
                        unlogActivity.mutate({ activityId: activity.id, date: todayDate })
                      } else {
                        logActivity.mutate({ activityId: activity.id, date: todayDate })
                      }
                    }}
                  >
                    {isDone ? 'Fait ✓' : 'Marquer comme fait'}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function WeekView({
  activities,
  weekDates,
  loggedDates,
}: {
  activities: WellnessActivity[]
  weekDates: string[]
  loggedDates: Set<string>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Cette semaine</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activité active.</p>
        ) : (
          <div className="flex flex-col gap-3 overflow-x-auto">
            <div className="grid grid-cols-[1fr_repeat(7,2rem)] items-center gap-2 text-xs text-muted-foreground">
              <span />
              {WEEKDAYS.map((day) => (
                <span key={day} className="text-center">
                  {weekdayLabel(day).slice(0, 1)}
                </span>
              ))}
            </div>
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="grid grid-cols-[1fr_repeat(7,2rem)] items-center gap-2"
              >
                <span className="truncate text-sm font-medium">{activity.name}</span>
                {WEEKDAYS.map((day, i) => {
                  const isScheduled = activity.days_of_week.includes(day)
                  const isDone =
                    isScheduled && loggedDates.has(`${activity.id}:${weekDates[i]}`)
                  return (
                    <span key={day} className="flex justify-center">
                      <span
                        className={
                          isDone
                            ? 'size-4 rounded-full bg-primary'
                            : isScheduled
                              ? 'size-4 rounded-full border-2 border-primary/50'
                              : 'size-4 rounded-full bg-muted'
                        }
                      />
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityFields({
  daysOfWeek,
  setDaysOfWeek,
  name,
  setName,
  reminderTime,
  setReminderTime,
  idPrefix,
}: {
  daysOfWeek: number[]
  setDaysOfWeek: (days: number[]) => void
  name: string
  setName: (name: string) => void
  reminderTime: string
  setReminderTime: (time: string) => void
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
          placeholder="Wim Hof, vacuum sous la douche…"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Jours</Label>
        <div className="grid grid-cols-7 gap-1 rounded-lg border border-border p-0.5">
          {WEEKDAYS.map((day) => (
            <Button
              key={day}
              type="button"
              size="sm"
              className="px-0"
              variant={daysOfWeek.includes(day) ? 'default' : 'ghost'}
              onClick={() =>
                setDaysOfWeek(
                  daysOfWeek.includes(day)
                    ? daysOfWeek.filter((d) => d !== day)
                    : [...daysOfWeek, day].sort((a, b) => a - b),
                )
              }
            >
              {weekdayLabel(day).slice(0, 3)}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-reminder`}>Rappel (optionnel)</Label>
        <Input
          id={`${idPrefix}-reminder`}
          type="time"
          value={reminderTime}
          onChange={(event) => setReminderTime(event.target.value)}
        />
      </div>
    </>
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

type ExerciseKind = 'activity' | 'protocol'

// One card, one create flow — hypoxia protocols are just another kind of
// wellness exercise now, not a separate feature living on its own page.
function CreateExerciseCard() {
  const [kind, setKind] = useState<ExerciseKind>('activity')

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2">
        <CardTitle as="h2">Ajouter un exercice</CardTitle>
        <div className="flex items-center gap-1 self-start rounded-lg border border-border p-0.5">
          <Button
            type="button"
            size="sm"
            variant={kind === 'activity' ? 'default' : 'ghost'}
            onClick={() => setKind('activity')}
          >
            Activité récurrente
          </Button>
          <Button
            type="button"
            size="sm"
            variant={kind === 'protocol' ? 'default' : 'ghost'}
            onClick={() => setKind('protocol')}
          >
            Protocole hypoxie
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {kind === 'activity' ? <CreateActivityForm /> : <CreateProtocolForm />}
      </CardContent>
    </Card>
  )
}

function CreateActivityForm() {
  const createActivity = useCreateWellnessActivity()
  const [name, setName] = useState('')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [reminderTime, setReminderTime] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim() === '' || daysOfWeek.length === 0) return
    const input: WellnessActivityInput = {
      name: name.trim(),
      days_of_week: daysOfWeek,
      reminder_time: reminderTime === '' ? null : reminderTime,
    }
    await createActivity.mutateAsync(input)
    setName('')
    setDaysOfWeek([])
    setReminderTime('')
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <ActivityFields
        idPrefix="create-activity"
        name={name}
        setName={setName}
        daysOfWeek={daysOfWeek}
        setDaysOfWeek={setDaysOfWeek}
        reminderTime={reminderTime}
        setReminderTime={setReminderTime}
      />
      {createActivity.isError && (
        <p role="alert" className="text-sm text-destructive">
          Impossible d'ajouter cette activité.
        </p>
      )}
      <Button
        type="submit"
        size="sm"
        className="self-start"
        disabled={createActivity.isPending || name.trim() === '' || daysOfWeek.length === 0}
      >
        {createActivity.isPending ? 'Ajout…' : 'Ajouter'}
      </Button>
    </form>
  )
}

function CreateProtocolForm() {
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
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <ProtocolFields
        idPrefix="create-protocol"
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
      <Button type="submit" size="sm" className="self-start" disabled={createProtocol.isPending || !isValid}>
        {createProtocol.isPending ? 'Ajout…' : 'Ajouter'}
      </Button>
    </form>
  )
}

function ExercisesListCard({
  activities,
  protocols,
  onLaunch,
}: {
  activities: WellnessActivity[]
  protocols: BreathProtocol[]
  onLaunch: (protocol: BreathProtocol) => void
}) {
  const [editingActivity, setEditingActivity] = useState<WellnessActivity | null>(null)
  const [editingProtocol, setEditingProtocol] = useState<BreathProtocol | null>(null)
  const isEmpty = activities.length === 0 && protocols.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Mes exercices</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">Aucun exercice pour l'instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} onEdit={setEditingActivity} />
            ))}
            {protocols.map((protocol) => (
              <ProtocolRow
                key={protocol.id}
                protocol={protocol}
                onLaunch={onLaunch}
                onEdit={setEditingProtocol}
              />
            ))}
          </ul>
        )}
      </CardContent>

      {editingActivity && (
        <EditActivityDialog activity={editingActivity} onClose={() => setEditingActivity(null)} />
      )}
      {editingProtocol && (
        <EditProtocolDialog protocol={editingProtocol} onClose={() => setEditingProtocol(null)} />
      )}
    </Card>
  )
}

function ActivityRow({
  activity,
  onEdit,
}: {
  activity: WellnessActivity
  onEdit: (activity: WellnessActivity) => void
}) {
  const updateActivity = useUpdateWellnessActivity()
  const deleteActivity = useDeleteWellnessActivity()

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
      <div>
        <p className="text-sm font-medium">{activity.name}</p>
        <p className="text-xs text-muted-foreground">
          {activity.days_of_week
            .slice()
            .sort((a, b) => a - b)
            .map((d) => weekdayLabel(d).slice(0, 3))
            .join(', ')}
          {activity.reminder_time && ` · ${activity.reminder_time.slice(0, 5)}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={updateActivity.isPending}
          onClick={() =>
            updateActivity.mutate({ id: activity.id, patch: { active: !activity.active } })
          }
        >
          {activity.active ? 'Active' : 'Inactive'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(activity)}>
          Modifier
        </Button>
        <ConfirmDialog
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Supprimer ${activity.name}`}
            >
              <Trash2 />
            </Button>
          }
          title={`Supprimer "${activity.name}" ?`}
          description="Cette action est irréversible et supprimera aussi son historique."
          confirmLabel="Supprimer"
          onConfirm={async () => {
            await deleteActivity.mutateAsync(activity.id)
          }}
        />
      </div>
    </li>
  )
}

function ProtocolRow({
  protocol,
  onLaunch,
  onEdit,
}: {
  protocol: BreathProtocol
  onLaunch: (protocol: BreathProtocol) => void
  onEdit: (protocol: BreathProtocol) => void
}) {
  const deleteProtocol = useDeleteBreathProtocol()

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
          <Wind className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium">{protocol.name}</p>
          <p className="text-xs text-muted-foreground">
            Apnée {protocol.hold_seconds}s · Récup {protocol.recovery_seconds}s ·{' '}
            {protocol.cycles} cycles
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" size="sm" onClick={() => onLaunch(protocol)}>
          Lancer
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(protocol)}>
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
  )
}

function EditActivityDialog({
  activity,
  onClose,
}: {
  activity: WellnessActivity
  onClose: () => void
}) {
  const updateActivity = useUpdateWellnessActivity()
  const [name, setName] = useState(activity.name)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(activity.days_of_week)
  const [reminderTime, setReminderTime] = useState(
    activity.reminder_time?.slice(0, 5) ?? '',
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim() === '' || daysOfWeek.length === 0) return
    await updateActivity.mutateAsync({
      id: activity.id,
      patch: {
        name: name.trim(),
        days_of_week: daysOfWeek,
        reminder_time: reminderTime === '' ? null : reminderTime,
      },
    })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier "{activity.name}"</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4"
        >
          <ActivityFields
            idPrefix="edit-activity"
            name={name}
            setName={setName}
            daysOfWeek={daysOfWeek}
            setDaysOfWeek={setDaysOfWeek}
            reminderTime={reminderTime}
            setReminderTime={setReminderTime}
          />
          {updateActivity.isError && (
            <p role="alert" className="text-sm text-destructive">
              Impossible d'enregistrer les modifications.
            </p>
          )}
          <Button
            type="submit"
            disabled={
              updateActivity.isPending || name.trim() === '' || daysOfWeek.length === 0
            }
          >
            {updateActivity.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
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
            idPrefix="edit-protocol"
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
          {protocol.cycles} cycles complétés · {protocol.name}
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
