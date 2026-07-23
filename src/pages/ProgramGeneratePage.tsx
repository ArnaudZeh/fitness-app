import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAiProviderKeys } from '@/hooks/useAiProviderKeys'
import { useProfile } from '@/hooks/useProfile'
import { useWeightEntries } from '@/hooks/useWeightEntries'
import { useCycleEntries } from '@/hooks/useCycleEntries'
import { useSetHistory } from '@/hooks/useAnalytics'
import { useApplyProgramProposal, useGenerateProgram } from '@/hooks/useProgramGeneration'
import { AI_PROVIDER_LABELS, type AiProvider } from '@/lib/ai-keys-api'
import { buildUserProfileContext } from '@/lib/user-context'
import { PROGRAM_FOCUS_LABELS } from '@/lib/programs-api'
import { DAY_TYPE_LABELS, WEEKDAY_LABELS } from '@/lib/sessions-api'
import type { AvailableExercise } from '@/lib/program-generation-api'

const DAYS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7]

export function ProgramGeneratePage() {
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const { data: weightEntries } = useWeightEntries()
  const { data: cycleEntries } = useCycleEntries({ enabled: Boolean(profile?.cycle_module_enabled) })
  const { data: history } = useSetHistory()
  const { data: keyStatuses } = useAiProviderKeys()

  const generateProgram = useGenerateProgram()
  const applyProposal = useApplyProgramProposal()

  const [selectedProvider, setSelectedProvider] = useState<AiProvider | null>(null)
  const [daysPerWeek, setDaysPerWeek] = useState(3)
  const [equipment, setEquipment] = useState('')
  const [constraints, setConstraints] = useState('')

  const configuredProviders = (keyStatuses ?? [])
    .filter((status) => status.is_valid)
    .map((status) => status.provider)
  const activeProvider = selectedProvider ?? configuredProviders[0] ?? null

  const availableExercises: AvailableExercise[] = Array.from(
    new Map(
      (history ?? []).map((record) => [
        record.exerciseId,
        { id: record.exerciseId, name: record.exerciseName, muscleGroup: record.muscleGroup },
      ]),
    ).values(),
  )

  if (configuredProviders.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Générer un programme avec l'IA</h1>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Configure une clé API (Anthropic ou OpenAI) dans ton profil pour générer un
              programme.
            </p>
            <Button asChild size="sm" className="self-start">
              <Link to="/profile">Configurer une clé</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (availableExercises.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Générer un programme avec l'IA</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Logue quelques séances d'abord — l'IA ne propose que des exercices que tu as déjà
              pratiqués.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeProvider || !profile) return
    generateProgram.mutate({
      provider: activeProvider,
      profileContext: buildUserProfileContext(profile, weightEntries ?? [], cycleEntries ?? []),
      availableExercises,
      daysPerWeek,
      equipment,
      constraints,
    })
  }

  async function handleApply() {
    if (!generateProgram.data) return
    const program = await applyProposal.mutateAsync(generateProgram.data)
    void navigate(`/programs/${program.id}`)
  }

  if (generateProgram.data) {
    const proposal = generateProgram.data
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Proposition de l'IA</h1>
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <CardTitle as="h2">{proposal.programName}</CardTitle>
              <Badge>{PROGRAM_FOCUS_LABELS[proposal.focus]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{proposal.rationale}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {proposal.days
              .slice()
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((day) => (
                <div key={day.dayOfWeek} className="flex flex-col gap-2 border-t pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{WEEKDAY_LABELS[day.dayOfWeek]}</span>
                    <Badge variant="outline">{DAY_TYPE_LABELS[day.dayType]}</Badge>
                  </div>
                  {day.exercises.length > 0 && (
                    <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {day.exercises.map((exercise, index) => (
                        <li key={`${day.dayOfWeek}-${index}`}>
                          {exercise.exerciseName} — {exercise.targetSets} × {exercise.targetRepsMin}
                          -{exercise.targetRepsMax} reps
                          {exercise.targetRpe !== null && ` @RPE ${exercise.targetRpe}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

            {applyProposal.isError && (
              <p role="alert" className="text-sm text-destructive">
                Impossible de créer le programme.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={applyProposal.isPending}
                onClick={() => void handleApply()}
              >
                {applyProposal.isPending ? 'Création…' : 'Créer ce programme'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={generateProgram.isPending}
                onClick={() =>
                  activeProvider &&
                  profile &&
                  generateProgram.mutate({
                    provider: activeProvider,
                    profileContext: buildUserProfileContext(profile, weightEntries ?? [], cycleEntries ?? []),
                    availableExercises,
                    daysPerWeek,
                    equipment,
                    constraints,
                  })
                }
              >
                Régénérer
              </Button>
              <Button type="button" variant="ghost" onClick={() => generateProgram.reset()}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Générer un programme avec l'IA</h1>
      <Card>
        <CardHeader>
          <CardTitle as="h2">Paramètres</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="daysPerWeek">Jours d'entraînement par semaine</Label>
              <Select
                value={String(daysPerWeek)}
                onValueChange={(value: string) => setDaysPerWeek(Number(value))}
              >
                <SelectTrigger id="daysPerWeek">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_PER_WEEK_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="equipment">Équipement disponible</Label>
              <Input
                id="equipment"
                value={equipment}
                onChange={(event) => setEquipment(event.target.value)}
                placeholder="Ex. Barre, haltères, banc, salle complète…"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="constraints">Contraintes ou préférences</Label>
              <Textarea
                id="constraints"
                value={constraints}
                onChange={(event) => setConstraints(event.target.value)}
                placeholder="Optionnel — ex. épaule sensible, pas de squat, préférence pour le haut du corps…"
              />
            </div>

            {generateProgram.isError && (
              <p role="alert" className="text-sm text-destructive">
                {generateProgram.error instanceof Error
                  ? generateProgram.error.message
                  : 'Impossible de générer un programme.'}
              </p>
            )}

            <Button type="submit" disabled={!activeProvider || generateProgram.isPending}>
              <Sparkles /> {generateProgram.isPending ? 'Génération…' : 'Générer le programme'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
