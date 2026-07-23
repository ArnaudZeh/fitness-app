import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { Mic, MicOff, Send, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAiProviderKeys } from '@/hooks/useAiProviderKeys'
import { useProfile } from '@/hooks/useProfile'
import { useWeightEntries } from '@/hooks/useWeightEntries'
import { useCycleEntries } from '@/hooks/useCycleEntries'
import { useSetHistory } from '@/hooks/useAnalytics'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import {
  useActiveProgramSnapshot,
  useApplyAssistantProposal,
  useAssistantMessages,
  useClearAssistantConversation,
  useSendAssistantMessage,
} from '@/hooks/useAssistant'
import { AI_PROVIDER_LABELS, type AiProvider } from '@/lib/ai-keys-api'
import { buildUserProfileContext } from '@/lib/user-context'
import { buildTrendSummary } from '@/lib/analytics'
import { PROGRAM_FOCUS_LABELS } from '@/lib/programs-api'
import { WEEKDAY_LABELS } from '@/lib/sessions-api'
import type { AssistantMessage } from '@/lib/assistant-api'
import type { AvailableExercise } from '@/lib/program-generation-api'

function ExerciseList({
  exercises,
}: {
  exercises: { exerciseName: string; targetSets: number; targetRepsMin: number; targetRepsMax: number; targetRpe: number | null }[]
}) {
  return (
    <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
      {exercises.map((exercise, index) => (
        <li key={`${exercise.exerciseName}-${index}`}>
          {exercise.exerciseName} — {exercise.targetSets} × {exercise.targetRepsMin}-
          {exercise.targetRepsMax} reps
          {exercise.targetRpe !== null && ` @RPE ${exercise.targetRpe}`}
        </li>
      ))}
    </ul>
  )
}

function AssistantProposalCard({ message }: { message: AssistantMessage }) {
  const proposal = message.toolProposal
  const applyProposal = useApplyAssistantProposal()
  if (!proposal) return null

  const isApplied = message.appliedAt !== null

  return (
    <Card className="mt-2">
      <CardContent className="flex flex-col gap-3 pt-4">
        {proposal.type === 'generer_programme' && (
          <>
            <div className="flex items-center gap-2">
              <p className="font-medium">{proposal.proposal.programName}</p>
              <Badge>{PROGRAM_FOCUS_LABELS[proposal.proposal.focus]}</Badge>
            </div>
            {proposal.proposal.days
              .slice()
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .filter((day) => day.exercises.length > 0)
              .map((day) => (
                <div key={day.dayOfWeek} className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{WEEKDAY_LABELS[day.dayOfWeek]}</p>
                  <ExerciseList exercises={day.exercises} />
                </div>
              ))}
          </>
        )}

        {proposal.type === 'adapter_seance' && (
          <ExerciseList exercises={proposal.proposal.exercises} />
        )}

        {applyProposal.isError && (
          <p role="alert" className="text-sm text-destructive">
            Impossible d'appliquer cette proposition.
          </p>
        )}

        <Button
          type="button"
          size="sm"
          className="self-start"
          disabled={isApplied || applyProposal.isPending}
          onClick={() => applyProposal.mutate(message)}
        >
          {isApplied
            ? 'Appliqué'
            : applyProposal.isPending
              ? 'Application…'
              : proposal.type === 'generer_programme'
                ? 'Créer ce programme'
                : 'Appliquer cette adaptation'}
        </Button>
      </CardContent>
    </Card>
  )
}

export function CoachPage() {
  const { data: keyStatuses } = useAiProviderKeys()
  const { data: profile } = useProfile()
  const { data: weightEntries } = useWeightEntries()
  const { data: cycleEntries } = useCycleEntries({ enabled: Boolean(profile?.cycle_module_enabled) })
  const { data: history } = useSetHistory()
  const { data: programStructure } = useActiveProgramSnapshot()
  const { data: messages } = useAssistantMessages()

  const sendMessage = useSendAssistantMessage()
  const clearConversation = useClearAssistantConversation()

  const [selectedProvider, setSelectedProvider] = useState<AiProvider | null>(null)
  const [draft, setDraft] = useState('')

  const voiceInput = useSpeechToText((transcript) => {
    setDraft((prev) => (prev.trim() === '' ? transcript : `${prev} ${transcript}`))
  })
  const textToSpeech = useTextToSpeech()

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeProvider || !profile || draft.trim() === '') return
    const conversationHistory = (messages ?? []).map((m) => ({ role: m.role, content: m.content }))
    sendMessage.mutate(
      {
        provider: activeProvider,
        message: draft.trim(),
        conversationHistory,
        profileContext: buildUserProfileContext(profile, weightEntries ?? [], cycleEntries ?? []),
        trendSummary: buildTrendSummary(history ?? []),
        programStructure: programStructure ?? [],
        availableExercises,
      },
      { onSuccess: () => setDraft('') },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="size-6" /> Coach
        </h1>
        {(messages ?? []).length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={clearConversation.isPending}
            onClick={() => clearConversation.mutate()}
          >
            Nouvelle conversation
          </Button>
        )}
      </div>

      {configuredProviders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Configure une clé API (Anthropic ou OpenAI) dans ton profil pour parler avec ton
              coach.
            </p>
            <Button asChild size="sm" className="self-start">
              <Link to="/profile">Configurer une clé</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
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

          {(messages ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Pose une question sur ta progression, demande un programme ou une adaptation de
              séance — ton coach a accès à ton profil, ton historique et ton programme actif.
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {(messages ?? []).map((message) => (
              <li
                key={message.id}
                className={message.role === 'user' ? 'self-end' : 'self-start'}
              >
                <div
                  className={
                    message.role === 'user'
                      ? 'whitespace-pre-line rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                      : 'whitespace-pre-line rounded-lg bg-muted px-3 py-2 text-sm'
                  }
                >
                  {message.content}
                </div>
                {message.role === 'assistant' && textToSpeech.isSupported && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      textToSpeech.speakingId === message.id
                        ? 'Arrêter la lecture'
                        : 'Écouter la réponse'
                    }
                    onClick={() => textToSpeech.speak(message.id, message.content)}
                  >
                    {textToSpeech.speakingId === message.id ? <VolumeX /> : <Volume2 />}
                  </Button>
                )}
                {message.role === 'assistant' && message.toolProposal && (
                  <AssistantProposalCard message={message} />
                )}
              </li>
            ))}
          </ul>

          {sendMessage.isError && (
            <p role="alert" className="text-sm text-destructive">
              {sendMessage.error instanceof Error
                ? sendMessage.error.message
                : "Impossible de contacter le coach."}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {voiceInput.isSupported && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                disabled={sendMessage.isPending}
                onClick={() =>
                  voiceInput.isListening ? voiceInput.stopListening() : voiceInput.startListening()
                }
              >
                {voiceInput.isListening ? (
                  <>
                    <MicOff /> Arrêter l'écoute
                  </>
                ) : (
                  <>
                    <Mic /> Dicter mon message
                  </>
                )}
              </Button>
            )}
            {voiceInput.error && (
              <p role="alert" className="text-sm text-destructive">
                {voiceInput.error}
              </p>
            )}
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Écris ton message…"
              disabled={sendMessage.isPending}
            />
            <Button
              type="submit"
              size="sm"
              className="self-end"
              disabled={!activeProvider || draft.trim() === '' || sendMessage.isPending}
            >
              <Send /> {sendMessage.isPending ? 'Envoi…' : 'Envoyer'}
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
