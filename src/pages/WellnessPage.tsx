import { type FormEvent, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  useCreateWellnessActivity,
  useDeleteWellnessActivity,
  useLogWellnessActivity,
  useUnlogWellnessActivity,
  useUpdateWellnessActivity,
  useWellnessActivities,
  useWellnessActivityLogs,
} from '@/hooks/useWellnessActivities'
import { useNotificationSupport, usePushSubscription } from '@/hooks/useNotifications'
import { WEEKDAY_LABELS } from '@/lib/sessions-api'
import type { WellnessActivity, WellnessActivityInput } from '@/lib/wellness-api'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const

// Every lookup here uses a key from WEEKDAYS (always 1-7) — non-null by
// construction, safe to assert rather than guard for a lookup that can't
// actually miss.
function weekdayLabel(day: number): string {
  return WEEKDAY_LABELS[day]!
}

function getTodayIsoDayOfWeek(now: Date = new Date()): number {
  const day = now.getDay()
  return day === 0 ? 7 : day
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
  const { data: activities, isLoading } = useWellnessActivities()

  const todayIsoDayOfWeek = getTodayIsoDayOfWeek()
  const todayDate = toLocalDateString(new Date())
  const weekDates = getCurrentWeekDates()
  const { data: logs } = useWellnessActivityLogs(weekDates[0], weekDates[6])

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>

  const allActivities = activities ?? []
  const activeActivities = allActivities.filter((a) => a.active)
  const loggedDates = new Set(
    (logs ?? []).map((l) => `${l.activity_id}:${l.completed_date}`),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Bien-être</h1>
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
      <CreateActivityCard />
      <ActivitiesListCard activities={allActivities} />
    </div>
  )
}

function NotificationsCard() {
  const support = useNotificationSupport()
  const { isSubscribed, isPending, error, subscribe, unsubscribe } = usePushSubscription()

  if (support === 'unsupported') return null

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Notifications</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {support === 'ios-not-installed' ? (
          <p className="text-sm text-muted-foreground">
            Sur iPhone/iPad, ajoutez d'abord cette app à l'écran d'accueil (Partager →
            « Sur l'écran d'accueil ») pour pouvoir activer les rappels.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Recevez un rappel au moment prévu pour chaque activité programmée.
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="button"
              variant={isSubscribed ? 'outline' : 'default'}
              className="self-start"
              disabled={isPending || isSubscribed === null || !VAPID_PUBLIC_KEY}
              onClick={() => {
                if (isSubscribed) {
                  void unsubscribe()
                } else if (VAPID_PUBLIC_KEY) {
                  void subscribe(VAPID_PUBLIC_KEY)
                }
              }}
            >
              {isPending
                ? 'Chargement…'
                : isSubscribed
                  ? 'Désactiver les notifications'
                  : 'Activer les notifications'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
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
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{activity.name}</p>
                    {activity.reminder_time && (
                      <p className="text-sm text-muted-foreground">
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
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border p-0.5">
          {WEEKDAYS.map((day) => (
            <Button
              key={day}
              type="button"
              size="sm"
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

function CreateActivityCard() {
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
    <Card>
      <CardHeader>
        <CardTitle as="h2">Ajouter une activité</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4"
        >
          <ActivityFields
            idPrefix="create"
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
            className="self-start"
            disabled={
              createActivity.isPending || name.trim() === '' || daysOfWeek.length === 0
            }
          >
            {createActivity.isPending ? 'Ajout…' : 'Ajouter'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ActivitiesListCard({ activities }: { activities: WellnessActivity[] }) {
  const updateActivity = useUpdateWellnessActivity()
  const deleteActivity = useDeleteWellnessActivity()
  const [editing, setEditing] = useState<WellnessActivity | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Mes activités</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activité pour l'instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border p-3"
              >
                <div>
                  <p className="font-medium">{activity.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.days_of_week
                      .slice()
                      .sort((a, b) => a - b)
                      .map((d) => weekdayLabel(d).slice(0, 3))
                      .join(', ')}
                    {activity.reminder_time && ` · ${activity.reminder_time.slice(0, 5)}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={updateActivity.isPending}
                    onClick={() =>
                      updateActivity.mutate({
                        id: activity.id,
                        patch: { active: !activity.active },
                      })
                    }
                  >
                    {activity.active ? 'Active' : 'Inactive'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(activity)}
                  >
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
            ))}
          </ul>
        )}
      </CardContent>

      {editing && (
        <EditActivityDialog activity={editing} onClose={() => setEditing(null)} />
      )}
    </Card>
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
            idPrefix="edit"
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
