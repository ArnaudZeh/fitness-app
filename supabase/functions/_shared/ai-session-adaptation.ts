import type { AiProvider } from './provider-validation.ts'
import { SESSION_ADAPTATION_SYSTEM_PROMPT } from './coach-persona.ts'
import { fetchWithTimeout } from './fetch-with-timeout.ts'
import { EXERCISE_SCHEMA, type ProgramProposalExercise } from './ai-program-generation.ts'

export interface SessionAdaptationProposal {
  rationale: string
  exercises: ProgramProposalExercise[]
}

export interface CurrentExercise {
  exerciseId: string
  exerciseName: string
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  targetRpe: number | null
}

export interface AdaptSessionInput {
  profileContext: unknown
  trendSummary: unknown
  currentExercises: CurrentExercise[]
  availableExercises: { id: string; name: string; muscleGroup: string | null }[]
  dayContext: string
}

const SESSION_ADAPTATION_SCHEMA = {
  type: 'object',
  properties: {
    rationale: { type: 'string' },
    exercises: { type: 'array', minItems: 1, items: EXERCISE_SCHEMA },
  },
  required: ['rationale', 'exercises'],
  additionalProperties: false,
}

function buildUserMessage(input: AdaptSessionInput): string {
  return [
    `Profil de l'utilisateur (JSON) :\n${JSON.stringify(input.profileContext)}`,
    `Données de régularité et de tonnage récentes (JSON) :\n${JSON.stringify(input.trendSummary)}`,
    `Composition actuelle de cette séance (JSON) :\n${JSON.stringify(input.currentExercises)}`,
    `Exercices disponibles, à choisir exclusivement dans cette liste (JSON) :\n${JSON.stringify(input.availableExercises)}`,
    `Contexte donné par l'utilisateur pour ce jour précis : ${input.dayContext || 'aucun'}`,
  ].join('\n\n')
}

// Same reasoning as validateProposal() in ai-program-generation.ts: the
// schema only guarantees shape, not that the model actually respected the
// allowed-exercise pool or the rep-range constraint.
function validateAdaptation(
  proposal: SessionAdaptationProposal,
  allowedExerciseIds: Set<string>,
): void {
  if (proposal.exercises.length === 0) {
    throw new Error('La séance adaptée ne peut pas être vide.')
  }
  for (const exercise of proposal.exercises) {
    if (!allowedExerciseIds.has(exercise.exerciseId)) {
      throw new Error(`Exercice proposé hors de la liste autorisée : ${exercise.exerciseName}.`)
    }
    if (exercise.targetRepsMax < exercise.targetRepsMin) {
      throw new Error(`Fourchette de répétitions incohérente pour ${exercise.exerciseName}.`)
    }
  }
}

interface AnthropicToolUseBlock {
  type: string
  input?: unknown
}

async function callAnthropic(
  apiKey: string,
  input: AdaptSessionInput,
): Promise<SessionAdaptationProposal> {
  // No `thinking` here either, same trade-off as program generation: a
  // forced tool_choice is incompatible with extended thinking, and forcing
  // the tool is what makes the structured output reliable enough to apply
  // without a human re-typing it.
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      system: SESSION_ADAPTATION_SYSTEM_PROMPT,
      tools: [
        {
          name: 'adapt_session',
          description: "Propose une adaptation d'une séance d'entraînement déjà planifiée.",
          input_schema: SESSION_ADAPTATION_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'adapt_session' },
      messages: [{ role: 'user', content: buildUserMessage(input) }],
    }),
  })
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Anthropic a répondu avec une erreur (${response.status}) : ${errorBody.slice(0, 200)}`,
    )
  }
  const data = (await response.json()) as { content?: AnthropicToolUseBlock[] }
  const toolUse = (data.content ?? []).find((block) => block.type === 'tool_use')
  if (!toolUse?.input) throw new Error('Le modèle n\'a pas renvoyé d\'adaptation structurée.')
  return toolUse.input as SessionAdaptationProposal
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[]
}

async function callOpenAi(
  apiKey: string,
  input: AdaptSessionInput,
): Promise<SessionAdaptationProposal> {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.6',
      max_tokens: 2048,
      messages: [
        { role: 'system', content: SESSION_ADAPTATION_SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(input) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'adapt_session',
          strict: true,
          schema: SESSION_ADAPTATION_SCHEMA,
        },
      },
    }),
  })
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `OpenAI a répondu avec une erreur (${response.status}) : ${errorBody.slice(0, 200)}`,
    )
  }
  const data = (await response.json()) as OpenAiChatResponse
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Le modèle n\'a pas renvoyé d\'adaptation structurée.')
  return JSON.parse(content) as SessionAdaptationProposal
}

export async function adaptSession(
  provider: AiProvider,
  apiKey: string,
  input: AdaptSessionInput,
): Promise<SessionAdaptationProposal> {
  const proposal =
    provider === 'anthropic' ? await callAnthropic(apiKey, input) : await callOpenAi(apiKey, input)
  validateAdaptation(proposal, new Set(input.availableExercises.map((e) => e.id)))
  return proposal
}
