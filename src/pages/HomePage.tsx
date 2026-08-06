import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Play, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { motion, MotionConfig, type Variants } from 'framer-motion'
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
import { ExerciseThumbnail } from '@/components/ExerciseThumbnail'
import { Avatar } from '@/components/Avatar'
import { useProfile } from '@/hooks/useProfile'
import { useAvatarUrl } from '@/hooks/useAvatar'
import { usePrograms } from '@/hooks/usePrograms'
import {
  useSessionTemplateExercises,
  useSessionTemplates,
} from '@/hooks/useSessionTemplates'
import { useAllSessionLogs, useSessionLogs, useStartSessionLog } from '@/hooks/useSessionLogs'
import { useWeightEntries } from '@/hooks/useWeightEntries'
import { useCycleEntries } from '@/hooks/useCycleEntries'
import { useSetHistory } from '@/hooks/useAnalytics'
import { useAiProviderKeys } from '@/hooks/useAiProviderKeys'
import { useAnalyzeTrends } from '@/hooks/useAiAnalysis'
import {
  buildTrendSummary,
  computeDailyVolume,
  computeWeeklyTonnage,
  countCompletedSessionsThisWeek,
  getCompletedSessionDates,
  getIsoWeekStart,
} from '@/lib/analytics'
import { toLocalDateString } from '@/lib/dates'
import type { SessionLog } from '@/lib/session-logs-api'
import { AI_PROVIDER_LABELS, type AiProvider } from '@/lib/ai-keys-api'
import { buildUserProfileContext } from '@/lib/user-context'
import { WEEKDAY_LABELS, getTodayIsoDayOfWeek } from '@/lib/sessions-api'
import type { Program } from '@/lib/programs-api'
import type { Profile } from '@/lib/profile-api'

// Reveal-once entrance for the dashboard card stack: fade + small rise,
// staggered so cards feel like they cascade in rather than pop together.
// Not a looping/idle animation — it settles and stops.
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export function HomePage() {
  const { data: profile } = useProfile()
  const { data: programs } = usePrograms()
  const { data: weightEntries } = useWeightEntries()
  const { data: history } = useSetHistory()
  const allLogs = useAllSessionLogs()
  const { data: avatarUrl } = useAvatarUrl(profile?.avatar_path ?? null)

  const activeProgram = (programs ?? [])
    .filter((program) => program.status === 'active')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="flex flex-col gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={cardVariants} className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Bonjour{profile?.display_name ? `, ${profile.display_name}` : ''}
          </h1>
          <Link to="/profile" aria-label="Voir mon profil">
            <Avatar
              url={avatarUrl ?? null}
              displayName={profile?.display_name ?? '?'}
              size="md"
            />
          </Link>
        </motion.div>

        <TodayCard program={activeProgram} />

        <ThisWeekCard history={history ?? []} allLogs={allLogs ?? []} />

        <WeightCard
          entries={weightEntries ?? []}
          targetWeightKg={profile?.target_weight_kg ?? null}
        />

        {profile && (
          <AiTrendAnalysisCard
            history={history ?? []}
            profile={profile}
            weightEntries={weightEntries ?? []}
          />
        )}
      </motion.div>
    </MotionConfig>
  )
}

// Shared entrance + tap treatment for each dashboard card. Mobile-only: no
// hover state (there's no pointer on a phone).
function DashboardCard({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={cardVariants} whileTap={{ scale: 0.99, transition: { duration: 0.1 } }}>
      {children}
    </motion.div>
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
      <DashboardCard>
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
      </DashboardCard>
    )
  }

  const todayDateStr = toLocalDateString(new Date().toISOString())
  // Any session actually started today, regardless of which day's template
  // it used — matching strictly on templateId missed a session run ahead of
  // schedule (e.g. Saturday's plan done on Thursday because the week
  // started early), showing "Repos aujourd'hui" or a redundant "Démarrer"
  // button right below a session the user had just finished.
  const todayLog = (logs ?? []).find(
    (log) => toLocalDateString(log.started_at) === todayDateStr,
  )
  const todayLogTemplate = todayLog
    ? (templates ?? []).find((t) => t.id === todayLog.session_template_id)
    : undefined
  const isOffPlanLog = todayLog !== undefined && todayLog.session_template_id !== templateId

  return (
    <DashboardCard>
      <Card>
        <CardHeader>
          <CardTitle as="h2">Aujourd'hui</CardTitle>
          <CardDescription>
            {program.name} · {WEEKDAY_LABELS[todayIsoDayOfWeek]}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {todayLog ? (
            <>
              <Badge variant={todayLog.status === 'completed' ? 'default' : 'outline'}>
                {todayLog.status === 'completed' ? 'Séance terminée' : 'Séance en cours'}
              </Badge>
              {isOffPlanLog && todayLogTemplate && (
                <p className="text-sm text-muted-foreground">
                  Séance {WEEKDAY_LABELS[todayLogTemplate.day_of_week]} faite aujourd'hui
                </p>
              )}
              <Button asChild size="sm" className="self-start">
                <Link to={`/sessions/${todayLog.id}`}>
                  {todayLog.status === 'completed'
                    ? 'Revoir la séance'
                    : 'Continuer la séance'}
                </Link>
              </Button>
            </>
          ) : !todayTemplate || todayTemplate.day_type === 'rest' ? (
            <p className="text-sm text-muted-foreground">Repos aujourd'hui.</p>
          ) : (
            <>
              {(exercises ?? []).length > 0 && (
                <ul className="flex flex-col gap-2">
                  {(exercises ?? []).map((slot) => (
                    <li
                      key={slot.id}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <ExerciseThumbnail
                        imageUrl={slot.exercise.image_url}
                        muscleGroup={slot.exercise.muscle_group}
                      />
                      {slot.exercise.name} · {slot.target_sets} x {slot.target_reps_min}-
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
    </DashboardCard>
  )
}

function ThisWeekCard({
  history,
  allLogs,
}: {
  history: NonNullable<ReturnType<typeof useSetHistory>['data']>
  allLogs: SessionLog[]
}) {
  // Sessions completed this week, not "days with logged sets" — a session
  // marked "Terminée" counts even if its sets never got filled in, since
  // that's still a séance réalisée as far as the user is concerned.
  const sessionsThisWeek = countCompletedSessionsThisWeek(allLogs)
  const dailyVolume = computeDailyVolume(history)
  const activeDates = getCompletedSessionDates(allLogs)
  const currentWeekStart = getIsoWeekStart(toLocalDateString(new Date().toISOString()))
  const tonnageThisWeek =
    computeWeeklyTonnage(history).find((w) => w.weekStart === currentWeekStart)?.tonnageKg ?? 0

  return (
    <DashboardCard>
      <Card>
        <CardHeader>
          <CardTitle as="h2">Analytics</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <p className="font-mono text-xl font-semibold tabular-nums">
              {sessionsThisWeek} séance{sessionsThisWeek > 1 ? 's' : ''}
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums">
              {Math.round(tonnageThisWeek)} kg
            </p>
          </div>
          <ContributionHeatmap
            dailyVolumeKg={dailyVolume}
            activeDates={activeDates}
            weeksToShow={8}
            fillWidth
          />
          <Link to="/analytics" className="text-sm text-primary hover:underline">
            Voir les stats complètes →
          </Link>
        </CardContent>
      </Card>
    </DashboardCard>
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
    <DashboardCard>
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Objectif : {targetWeightKg} kg</span>
                  <Badge variant={latest.weight_kg === targetWeightKg ? 'default' : 'outline'}>
                    {latest.weight_kg === targetWeightKg
                      ? 'Atteint'
                      : `${Math.abs(latest.weight_kg - targetWeightKg).toFixed(1)} kg restants`}
                  </Badge>
                </div>
              )}
              <Link to="/profile" className="text-sm text-primary hover:underline">
                Voir l'historique →
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardCard>
  )
}

function AiTrendAnalysisCard({
  history,
  profile,
  weightEntries,
}: {
  history: NonNullable<ReturnType<typeof useSetHistory>['data']>
  profile: Profile
  weightEntries: NonNullable<ReturnType<typeof useWeightEntries>['data']>
}) {
  const { data: keyStatuses } = useAiProviderKeys()
  const { data: cycleEntries } = useCycleEntries({ enabled: profile.cycle_module_enabled })
  const analyzeTrends = useAnalyzeTrends()
  const [selectedProvider, setSelectedProvider] = useState<AiProvider | null>(null)

  const configuredProviders = (keyStatuses ?? [])
    .filter((status) => status.is_valid)
    .map((status) => status.provider)
  const activeProvider = selectedProvider ?? configuredProviders[0] ?? null

  if (configuredProviders.length === 0) {
    return (
      <DashboardCard>
        <Card>
          <CardHeader>
            <CardTitle as="h2">Analyse IA</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Configure une clé API (Anthropic ou OpenAI) dans ton profil pour analyser tes
              tendances d'entraînement.
            </p>
            <Button asChild size="sm" className="self-start">
              <Link to="/profile">Configurer une clé</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardCard>
    )
  }

  const hasEnoughHistory = history.length > 0

  return (
    <DashboardCard>
      <Card>
        <CardHeader>
          <CardTitle as="h2">Analyse IA</CardTitle>
          <CardDescription>
            Tendance de tes 8 dernières semaines (un appel à ta propre clé à chaque analyse).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {configuredProviders.length > 1 && (
            <div className="flex items-center gap-1 self-start rounded-lg border border-border p-0.5">
              {configuredProviders.map((provider) => (
                <Button
                  key={provider}
                  type="button"
                  size="sm"
                  variant={activeProvider === provider ? 'default' : 'ghost'}
                  onClick={() => setSelectedProvider(provider)}
                >
                  {AI_PROVIDER_LABELS[provider]}
                </Button>
              ))}
            </div>
          )}

          {!hasEnoughHistory && (
            <p className="text-sm text-muted-foreground">
              Logue quelques séances d'abord pour avoir de quoi analyser.
            </p>
          )}

          {analyzeTrends.isError && (
            <p role="alert" className="text-sm text-destructive">
              {analyzeTrends.error instanceof Error
                ? analyzeTrends.error.message
                : 'Impossible de générer une analyse.'}
            </p>
          )}

          {analyzeTrends.data && (
            <p className="whitespace-pre-line text-sm">{analyzeTrends.data}</p>
          )}

          <Button
            type="button"
            size="sm"
            className="self-start"
            disabled={!activeProvider || !hasEnoughHistory || analyzeTrends.isPending}
            onClick={() => {
              if (!activeProvider) return
              analyzeTrends.mutate({
                provider: activeProvider,
                summary: buildTrendSummary(history),
                profileContext: buildUserProfileContext(profile, weightEntries, cycleEntries ?? []),
              })
            }}
          >
            <Sparkles /> {analyzeTrends.isPending ? 'Analyse en cours…' : 'Analyser mes progrès'}
          </Button>
        </CardContent>
      </Card>
    </DashboardCard>
  )
}
