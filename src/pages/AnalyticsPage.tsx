import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ContributionHeatmap } from '@/components/ContributionHeatmap'
import { ExerciseThumbnail } from '@/components/ExerciseThumbnail'
import { useSetHistory } from '@/hooks/useAnalytics'
import { useAllSessionLogs } from '@/hooks/useSessionLogs'
import {
  computeDailyVolume,
  computeOneRepMaxProgression,
  computeWeeklyTonnage,
  getCompletedSessionDates,
  getLoggedExercises,
} from '@/lib/analytics'

// These are already plain calendar dates (YYYY-MM-DD, local to the viewer —
// see toLocalDateString), not instants — must render in UTC. Without an
// explicit timeZone, toLocaleDateString uses the viewer's local zone, which
// would reinterpret the "T00:00:00Z" anchor and shift the displayed day back
// by one for anyone west of UTC even though the date string is already
// correct as-is.
function formatShortDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

export function AnalyticsPage() {
  const { data, isLoading, isError } = useSetHistory()
  const allLogs = useAllSessionLogs()
  const [selectedExerciseId, setSelectedExerciseId] = useState('')

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>
  if (isError)
    return (
      <p role="alert" className="text-destructive">
        Impossible de charger tes statistiques.
      </p>
    )

  const history = data ?? []
  const activeDates = getCompletedSessionDates(allLogs ?? [])

  // A completed session with no sets entered still counts as activity —
  // only bail out to the empty state when there's truly nothing at all.
  if (history.length === 0 && activeDates.size === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">
          Aucune séance enregistrée pour l'instant. Logge quelques séances pour voir tes
          statistiques ici.
        </p>
      </div>
    )
  }

  const exercises = getLoggedExercises(history)
  const effectiveExerciseId = selectedExerciseId || (exercises[0]?.exerciseId ?? '')
  const progression = effectiveExerciseId
    ? computeOneRepMaxProgression(history, effectiveExerciseId).map((point) => ({
        ...point,
        label: formatShortDate(point.date),
      }))
    : []
  const weeklyTonnage = computeWeeklyTonnage(history).map((point) => ({
    ...point,
    label: formatShortDate(point.weekStart),
  }))
  const dailyVolume = computeDailyVolume(history)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Analytics</h1>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Régularité</CardTitle>
        </CardHeader>
        <CardContent>
          <ContributionHeatmap dailyVolumeKg={dailyVolume} activeDates={activeDates} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Tonnage hebdomadaire</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyTonnage}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                className="fill-muted-foreground text-xs"
                tickLine={false}
              />
              <YAxis className="fill-muted-foreground text-xs" tickLine={false} />
              <Tooltip
                cursor={{ fill: 'var(--primary)', fillOpacity: 0.08 }}
                formatter={(value) => [`${Math.round(Number(value))} kg`, 'Tonnage']}
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
                labelStyle={{ color: 'var(--popover-foreground)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--popover-foreground)' }}
              />
              <Bar
                dataKey="tonnageKg"
                className="fill-primary"
                radius={4}
                maxBarSize={48}
                activeBar={{ className: 'fill-primary', stroke: 'none' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle as="h2">Progression par exercice</CardTitle>
          <Select value={effectiveExerciseId} onValueChange={setSelectedExerciseId}>
            <SelectTrigger aria-label="Choisir un exercice">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((exercise) => (
                <SelectItem key={exercise.exerciseId} value={exercise.exerciseId}>
                  <span className="flex items-center gap-2">
                    <ExerciseThumbnail imageUrl={exercise.imageUrl} muscleGroup={null} />
                    {exercise.exerciseName}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {progression.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Pas encore de données pour cet exercice.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={progression}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  className="fill-muted-foreground text-xs"
                  tickLine={false}
                />
                <YAxis className="fill-muted-foreground text-xs" tickLine={false} />
                <Tooltip
                  cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                  formatter={(value, name) => [`${Math.round(Number(value))} kg`, name]}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: 'var(--popover-foreground)', fontWeight: 600 }}
                  itemStyle={{ color: 'var(--popover-foreground)' }}
                />
                <Line
                  type="monotone"
                  dataKey="estimatedOneRepMaxKg"
                  name="1RM estimé"
                  className="stroke-primary"
                  strokeWidth={2}
                  connectNulls
                  dot={false}
                  activeDot={{ className: 'fill-primary', stroke: 'var(--background)' }}
                />
                <Line
                  type="monotone"
                  dataKey="maxWeightKg"
                  name="Charge max"
                  className="stroke-secondary"
                  activeDot={{ className: 'fill-secondary', stroke: 'var(--background)' }}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            1RM estimé = moyenne des formules Epley et Brzycki, fiable jusqu'à ~12
            répétitions. Au-delà, seule la charge max est affichée.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
