import { useState, type ReactNode } from 'react'
import { CheckCircle2, Dumbbell, Moon, Play, Plus, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { motion, MotionConfig, type Variants } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ActivityRings, type RingDatum, type RingId } from '@/components/ActivityRings'
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
  computeWeeklyTonnageProgress,
  computeWeightGoalProgress,
  countCompletedSessionsThisWeek,
  getCompletedSessionDates,
} from '@/lib/analytics'
import { toLocalDateString } from '@/lib/dates'
import type { SessionLog } from '@/lib/session-logs-api'
import { AI_PROVIDER_LABELS, type AiProvider } from '@/lib/ai-keys-api'
import { buildUserProfileContext } from '@/lib/user-context'
import {
  WEEKDAY_LABELS,
  computeSuggestedMuscleGroupLabel,
  getTodayIsoDayOfWeek,
} from '@/lib/sessions-api'
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
        className="flex flex-col gap-2 pb-2"
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

        <WeeklyRingsSection
          program={activeProgram}
          allLogs={allLogs ?? []}
          history={history ?? []}
          weightEntries={weightEntries ?? []}
          targetWeightKg={profile?.target_weight_kg ?? null}
        />

        <TodayCard program={activeProgram} />

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

// Compact icon + 2-line row shared by the TodayCard and AI analysis teaser —
// a title line and a single subtitle line, nothing else, so every dashboard
// card below the rings reads at a glance.
function RowIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
      {children}
    </div>
  )
}

function RowText({ title, subtitle }: { title: string; subtitle: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="truncate font-heading text-base font-semibold">{title}</p>
      <div className="line-clamp-2 text-sm text-muted-foreground">{subtitle}</div>
    </div>
  )
}

function RingLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

// chart-1 (teal) and chart-2 (orange) are the brand's existing accents, but
// chart-3 (green, #6ee7a8) sits too close to chart-1 in hue to tell the two
// rings apart at a glance. Magenta replaces it — validated against this
// exact trio + the app's dark background (#0b0f14) with the dataviz skill's
// palette checker: worst adjacent CVD ΔE 15.7 (target ≥8), worst
// normal-vision ΔE 18.3 (floor ≥15), all three ≥3:1 contrast on the
// background. Not themed as --chart-3 since it's specific to this
// three-ring read, not the general chart palette.
const RING_COLORS: Record<RingId, string> = {
  sessions: 'var(--chart-1)',
  tonnage: 'var(--chart-2)',
  weight: '#d55181',
}

// The dashboard's hero element: three Apple-Watch-style concentric rings —
// séances this week (outer), tonnage this week vs last week (middle),
// progress toward the weight goal (inner). Tapping a ring opens a small
// popup with that ring's own detail; this replaces the old separate
// Analytics-heatmap and Poids cards entirely — their content now lives in
// these popups (heatmap itself stays on the full Analytics page, reachable
// via "Voir les stats complètes" below).
function WeeklyRingsSection({
  program,
  allLogs,
  history,
  weightEntries,
  targetWeightKg,
}: {
  program: Program | undefined
  allLogs: SessionLog[]
  history: NonNullable<ReturnType<typeof useSetHistory>['data']>
  weightEntries: NonNullable<ReturnType<typeof useWeightEntries>['data']>
  targetWeightKg: number | null
}) {
  const { data: templates } = useSessionTemplates(program?.id ?? '')
  const [selectedRing, setSelectedRing] = useState<RingId | null>(null)

  const sessionsThisWeek = countCompletedSessionsThisWeek(allLogs)
  const weeklyTarget = (templates ?? []).filter((t) => t.day_type === 'training').length
  const sessionsRatio = weeklyTarget > 0 ? Math.min(1, sessionsThisWeek / weeklyTarget) : null

  const tonnage = computeWeeklyTonnageProgress(history, getCompletedSessionDates(allLogs))
  const weightGoal = computeWeightGoalProgress(weightEntries, targetWeightKg)

  const latestWeight = weightEntries[0]
  const previousWeight = weightEntries[1]
  const weightDelta =
    latestWeight && previousWeight ? latestWeight.weight_kg - previousWeight.weight_kg : null

  const rings: [RingDatum, RingDatum, RingDatum] = [
    {
      id: 'sessions',
      ratio: sessionsRatio,
      color: RING_COLORS.sessions,
      label: `Séances cette semaine : ${sessionsThisWeek} sur ${weeklyTarget || 'objectif non défini'}`,
    },
    {
      id: 'tonnage',
      ratio: tonnage.ratio,
      color: RING_COLORS.tonnage,
      label: 'Tonnage cette semaine par rapport à la semaine dernière',
    },
    {
      id: 'weight',
      ratio: weightGoal.ratio,
      color: RING_COLORS.weight,
      label: 'Progression vers ton objectif de poids',
    },
  ]

  return (
    <>
      <motion.div variants={cardVariants} className="flex flex-col items-center gap-2 py-1">
        <div className="mx-auto w-full max-w-[256px]">
          <ActivityRings
            rings={rings}
            centerValue={`${sessionsThisWeek}/${weeklyTarget || '–'}`}
            centerLabel="séances"
            onSelectRing={setSelectedRing}
          />
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <RingLegendItem color={RING_COLORS.sessions} label="Séances" />
          <RingLegendItem color={RING_COLORS.tonnage} label="Tonnage" />
          <RingLegendItem color={RING_COLORS.weight} label="Poids" />
        </div>
        <Link to="/analytics" className="text-sm text-primary hover:underline">
          Voir les stats complètes →
        </Link>
      </motion.div>

      <Dialog
        open={selectedRing !== null}
        onOpenChange={(open: boolean) => !open && setSelectedRing(null)}
      >
        <DialogContent>
          {selectedRing === 'sessions' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: RING_COLORS.sessions }}
                  />
                  Séances cette semaine
                </DialogTitle>
              </DialogHeader>
              <p className="font-mono text-3xl font-semibold tabular-nums">
                {sessionsThisWeek}/{weeklyTarget || '–'}
              </p>
              <p className="text-sm text-muted-foreground">
                {weeklyTarget > 0
                  ? `Objectif basé sur les ${weeklyTarget} jour${weeklyTarget > 1 ? 's' : ''} d'entraînement de ton programme actif.`
                  : "Active un programme pour définir un objectif hebdomadaire."}
              </p>
            </>
          )}

          {selectedRing === 'tonnage' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: RING_COLORS.tonnage }}
                  />
                  Tonnage cette semaine
                </DialogTitle>
              </DialogHeader>
              <p className="font-mono text-3xl font-semibold tabular-nums">
                {Math.round(tonnage.thisWeekTonnageKg)} kg
              </p>
              <p className="text-sm text-muted-foreground">
                {tonnage.lastWeekTonnageKg !== null
                  ? `${Math.round((tonnage.ratio ?? 0) * 100)}% du tonnage de la semaine dernière (${Math.round(tonnage.lastWeekTonnageKg)} kg).`
                  : tonnage.lastWeekHadSessions
                    ? 'Séance(s) complétée(s) la semaine dernière, mais sans charge ni répétitions enregistrées — rien à comparer.'
                    : tonnage.thisWeekTonnageKg > 0
                      ? 'Aucune séance la semaine dernière pour comparer.'
                      : 'Pas encore de tonnage enregistré cette semaine.'}
              </p>
            </>
          )}

          {selectedRing === 'weight' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: RING_COLORS.weight }}
                  />
                  Objectif de poids
                </DialogTitle>
              </DialogHeader>
              {!latestWeight ? (
                <>
                  <p className="text-sm text-muted-foreground">Aucune pesée enregistrée.</p>
                  <Button asChild size="sm" className="self-start">
                    <Link to="/profile">Enregistrer mon poids</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-mono text-3xl font-semibold tabular-nums">
                    {latestWeight.weight_kg} kg
                  </p>
                  {weightDelta !== null && weightDelta !== 0 && (
                    <p className="text-sm text-muted-foreground">
                      {weightDelta > 0 ? '+' : '−'}
                      {Math.abs(weightDelta).toFixed(1)} kg depuis la dernière pesée
                    </p>
                  )}
                  {targetWeightKg !== null && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Objectif : {targetWeightKg} kg</span>
                      <Badge
                        variant={latestWeight.weight_kg === targetWeightKg ? 'default' : 'outline'}
                      >
                        {latestWeight.weight_kg === targetWeightKg
                          ? 'Atteint'
                          : `${Math.abs(latestWeight.weight_kg - targetWeightKg).toFixed(1)} kg restants`}
                      </Badge>
                    </div>
                  )}
                  <Link to="/profile" className="text-sm text-primary hover:underline">
                    Voir l'historique →
                  </Link>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
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

  const todayDateStr = toLocalDateString(new Date().toISOString())
  // Any session actually started today, regardless of which day's template
  // it used — matching strictly on templateId missed a session run ahead of
  // schedule (e.g. Saturday's plan done on Thursday because the week
  // started early).
  const todayLog = (logs ?? []).find(
    (log) => toLocalDateString(log.started_at) === todayDateStr,
  )
  const todayLogTemplate = todayLog
    ? (templates ?? []).find((t) => t.id === todayLog.session_template_id)
    : undefined

  const relevantTemplate = todayLog ? (todayLogTemplate ?? todayTemplate) : todayTemplate
  const relevantTemplateId = relevantTemplate?.id ?? ''
  // Called unconditionally, above every early return below — hooks can't be
  // called conditionally, and this one depends on values only known after
  // the program/template checks that used to sit above it (React error #310
  // in production: "rendered more hooks than during the previous render").
  const { data: exercises } = useSessionTemplateExercises(relevantTemplateId)
  const exerciseCount = (exercises ?? []).length

  if (!program) {
    return (
      <DashboardCard>
        <Link to="/programs">
          <Card size="sm" className="transition-colors active:bg-muted/50">
            <CardContent className="flex items-center gap-3">
              <RowIcon>
                <Plus className="size-5" />
              </RowIcon>
              <RowText title="Aucun programme actif" subtitle="Active un programme →" />
            </CardContent>
          </Card>
        </Link>
      </DashboardCard>
    )
  }

  if (!relevantTemplate || relevantTemplate.day_type === 'rest') {
    return (
      <DashboardCard>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <RowIcon>
              <Moon className="size-5 text-muted-foreground" />
            </RowIcon>
            <RowText title="Repos aujourd'hui" subtitle={program.name} />
          </CardContent>
        </Card>
      </DashboardCard>
    )
  }

  const muscleLabel =
    relevantTemplate.muscle_group_label ?? computeSuggestedMuscleGroupLabel(exercises ?? [])
  const title = muscleLabel ?? WEEKDAY_LABELS[relevantTemplate.day_of_week] ?? 'Séance'

  if (todayLog) {
    return (
      <DashboardCard>
        <Link to={`/sessions/${todayLog.id}`}>
          <Card size="sm" className="transition-colors active:bg-muted/50">
            <CardContent className="flex items-center gap-3">
              <RowIcon>
                {todayLog.status === 'completed' ? (
                  <CheckCircle2 className="size-5 text-primary" />
                ) : (
                  <Play className="size-5 text-primary" />
                )}
              </RowIcon>
              <RowText
                title={title}
                subtitle={
                  <span className="flex items-center gap-2">
                    <Badge variant={todayLog.status === 'completed' ? 'default' : 'outline'}>
                      {todayLog.status === 'completed' ? 'Terminée' : 'En cours'}
                    </Badge>
                    <span>
                      {exerciseCount} exercice{exerciseCount > 1 ? 's' : ''}
                    </span>
                  </span>
                }
              />
            </CardContent>
          </Card>
        </Link>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard>
      <button
        type="button"
        className="block w-full text-left disabled:opacity-60"
        disabled={startSessionLog.isPending}
        onClick={() =>
          startSessionLog.mutate(relevantTemplateId, {
            onSuccess: (log) => void navigate(`/sessions/${log.id}`),
          })
        }
      >
        <Card size="sm" className="transition-colors active:bg-muted/50">
          <CardContent className="flex items-center gap-3">
            <RowIcon>
              <Dumbbell className="size-5 text-primary" />
            </RowIcon>
            <RowText
              title={title}
              subtitle={`${exerciseCount} exercice${exerciseCount > 1 ? 's' : ''}`}
            />
          </CardContent>
        </Card>
      </button>
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
  const [open, setOpen] = useState(false)

  const configuredProviders = (keyStatuses ?? [])
    .filter((status) => status.is_valid)
    .map((status) => status.provider)
  const activeProvider = selectedProvider ?? configuredProviders[0] ?? null
  const hasEnoughHistory = history.length > 0

  if (configuredProviders.length === 0) {
    return (
      <DashboardCard>
        <Link to="/profile">
          <Card size="sm" className="transition-colors active:bg-muted/50">
            <CardContent className="flex items-center gap-3">
              <RowIcon>
                <Sparkles className="size-5" />
              </RowIcon>
              <RowText title="Analyse IA" subtitle="Configure une clé API dans ton profil →" />
            </CardContent>
          </Card>
        </Link>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button type="button" className="block w-full text-left">
            <Card size="sm" className="transition-colors active:bg-muted/50">
              <CardContent className="flex items-center gap-3">
                <RowIcon>
                  <Sparkles className="size-5 text-primary" />
                </RowIcon>
                <RowText
                  title="Analyse IA"
                  subtitle="Tendance de tes 8 dernières semaines d'entraînement"
                />
              </CardContent>
            </Card>
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analyse IA</DialogTitle>
            <DialogDescription>
              Tendance de tes 8 dernières semaines (un appel à ta propre clé à chaque analyse).
            </DialogDescription>
          </DialogHeader>

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
        </DialogContent>
      </Dialog>
    </DashboardCard>
  )
}
