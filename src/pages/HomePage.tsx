import { ArrowDown, ArrowUp, Play } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ContributionHeatmap } from '@/components/ContributionHeatmap'
import { useProfile } from '@/hooks/useProfile'
import { usePrograms } from '@/hooks/usePrograms'
import {
  useSessionTemplateExercises,
  useSessionTemplates,
} from '@/hooks/useSessionTemplates'
import { useSessionLogs, useStartSessionLog } from '@/hooks/useSessionLogs'
import { useWeightEntries } from '@/hooks/useWeightEntries'
import { useSetHistory } from '@/hooks/useAnalytics'
import {
  computeDailyVolume,
  countTrainingDaysThisWeek,
  getMostRecentHighlight,
} from '@/lib/analytics'
import { WEEKDAY_LABELS } from '@/lib/sessions-api'
import type { Program } from '@/lib/programs-api'

function getTodayIsoDayOfWeek(now: Date = new Date()): number {
  const day = now.getDay()
  return day === 0 ? 7 : day
}

function toLocalDateString(instant: string): string {
  const date = new Date(instant)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function HomePage() {
  const { data: profile } = useProfile()
  const { data: programs } = usePrograms()
  const { data: weightEntries } = useWeightEntries()
  const { data: history } = useSetHistory()

  const activeProgram = (programs ?? [])
    .filter((program) => program.status === 'active')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        Bonjour{profile?.display_name ? `, ${profile.display_name}` : ''}
      </h1>

      <TodayCard program={activeProgram} />

      {history && history.length > 0 && <RecentHighlightCard history={history} />}

      <ThisWeekCard history={history ?? []} />

      <WeightCard
        entries={weightEntries ?? []}
        targetWeightKg={profile?.target_weight_kg ?? null}
      />

      <Link to="/programs">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Mes programmes</CardTitle>
            <CardDescription>
              Créer, éditer et suivre tes programmes de musculation
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  )
}

function TodayCard({ program }: { program: Program | undefined }) {
  const navigate = useNavigate()
  const programId = program?.id ?? ''
  const { data: templates } = useSessionTemplates(programId)
  const logs = useSessionLogs(programId)
  const startSessionLog = useStartSessionLog(programId)

  const todayIsoDayOfWeek = getTodayIsoDayOfWeek()
  const todayTemplate = (templates ?? []).find((t) => t.day_of_week === todayIsoDayOfWeek)
  const templateId = todayTemplate?.id ?? ''
  const { data: exercises } = useSessionTemplateExercises(templateId)

  if (!program) {
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h2">Aujourd'hui</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Aucun programme actif. Active un programme pour voir ta séance du jour ici.
          </p>
          <Button asChild size="sm" className="self-start">
            <Link to="/programs">Voir mes programmes</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const todayDateStr = toLocalDateString(new Date().toISOString())
  const todayLog = (logs ?? []).find(
    (log) =>
      log.session_template_id === templateId &&
      toLocalDateString(log.started_at) === todayDateStr,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Aujourd'hui</CardTitle>
        <CardDescription>
          {program.name} — {WEEKDAY_LABELS[todayIsoDayOfWeek]}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!todayTemplate || todayTemplate.day_type === 'rest' ? (
          <p className="text-sm text-muted-foreground">Repos aujourd'hui.</p>
        ) : todayLog ? (
          <>
            <Badge variant={todayLog.status === 'completed' ? 'default' : 'outline'}>
              {todayLog.status === 'completed' ? 'Séance terminée' : 'Séance en cours'}
            </Badge>
            <Button asChild size="sm" className="self-start">
              <Link to={`/sessions/${todayLog.id}`}>
                {todayLog.status === 'completed'
                  ? 'Revoir la séance'
                  : 'Continuer la séance'}
              </Link>
            </Button>
          </>
        ) : (
          <>
            {(exercises ?? []).length > 0 && (
              <ul className="flex flex-col gap-1">
                {(exercises ?? []).map((slot) => (
                  <li key={slot.id} className="text-sm text-muted-foreground">
                    {slot.exercise.name} — {slot.target_sets} x {slot.target_reps_min}-
                    {slot.target_reps_max}
                  </li>
                ))}
              </ul>
            )}
            <Button
              size="sm"
              className="self-start"
              disabled={startSessionLog.isPending}
              onClick={() =>
                startSessionLog.mutate(templateId, {
                  onSuccess: (log) => void navigate(`/sessions/${log.id}`),
                })
              }
            >
              <Play /> Démarrer la séance
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function RecentHighlightCard({
  history,
}: {
  history: NonNullable<ReturnType<typeof useSetHistory>['data']>
}) {
  const highlight = getMostRecentHighlight(history)
  if (!highlight) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Dernière séance</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="font-mono text-lg font-semibold tabular-nums">
          {highlight.exerciseName} — {highlight.weightKg} kg x {highlight.reps}
        </p>
        {highlight.estimatedOneRepMaxKg !== null && (
          <p className="text-sm text-muted-foreground">
            1RM estimé : {Math.round(highlight.estimatedOneRepMaxKg)} kg
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ThisWeekCard({
  history,
}: {
  history: NonNullable<ReturnType<typeof useSetHistory>['data']>
}) {
  const sessionsThisWeek = countTrainingDaysThisWeek(history)
  const dailyVolume = computeDailyVolume(history)

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Cette semaine</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="font-mono text-2xl font-semibold tabular-nums">
          {sessionsThisWeek} séance{sessionsThisWeek > 1 ? 's' : ''}
        </p>
        <ContributionHeatmap dailyVolumeKg={dailyVolume} weeksToShow={8} />
        <Link to="/analytics" className="text-sm text-primary hover:underline">
          Voir les stats complètes →
        </Link>
      </CardContent>
    </Card>
  )
}

function WeightCard({
  entries,
  targetWeightKg,
}: {
  entries: NonNullable<ReturnType<typeof useWeightEntries>['data']>
  targetWeightKg: number | null
}) {
  const latest = entries[0]
  const previous = entries[1]
  const delta = latest && previous ? latest.weight_kg - previous.weight_kg : null

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Poids</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {!latest ? (
          <>
            <p className="text-sm text-muted-foreground">Aucune pesée enregistrée.</p>
            <Button asChild size="sm" className="self-start">
              <Link to="/profile">Enregistrer mon poids</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {latest.weight_kg} kg
            </p>
            {delta !== null && delta !== 0 && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                {delta > 0 ? (
                  <ArrowUp className="size-3.5" />
                ) : (
                  <ArrowDown className="size-3.5" />
                )}
                {Math.abs(delta).toFixed(1)} kg depuis la dernière pesée
              </p>
            )}
            {targetWeightKg !== null && (
              <p className="text-sm text-muted-foreground">
                Objectif : {targetWeightKg} kg (
                {Math.abs(latest.weight_kg - targetWeightKg).toFixed(1)} kg restants)
              </p>
            )}
            <Link to="/profile" className="text-sm text-primary hover:underline">
              Voir l'historique →
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
