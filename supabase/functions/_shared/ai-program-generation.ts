import type { AiProvider } from './provider-validation.ts'
import { PROGRAM_GENERATION_SYSTEM_PROMPT } from './coach-persona.ts'
import { fetchWithTimeout } from './fetch-with-timeout.ts'

export interface ProgramProposalExercise {
  exerciseId: string
  exerciseName: string
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  targetRpe: number | null
  targetWeightKg: number | null
}

export interface ProgramProposalDay {
  dayOfWeek: number
  dayType: 'training' | 'rest'
  exercises: ProgramProposalExercise[]
}

export interface ProgramProposal {
  programName: string
  focus: 'force' | 'hypertrophie' | 'endurance'
  rationale: string
  days: ProgramProposalDay[]
}

export interface GenerateProgramInput {
  profileContext: unknown
  availableExercises: { id: string; name: string; muscleGroup: string | null }[]
  daysPerWeek: number
  equipment: string
  constraints: string
}

// additionalProperties:false and every property listed in "required" are
// needed for OpenAI's strict structured-output mode — harmless extra
// strictness for Anthropic's tool input_schema, which doesn't require it.
export const EXERCISE_SCHEMA = {
  type: 'object',
  properties: {
    exerciseId: { type: 'string' },
    exerciseName: { type: 'string' },
    targetSets: { type: 'integer', minimum: 1 },
    targetRepsMin: { type: 'integer', minimum: 1 },
    targetRepsMax: { type: 'integer', minimum: 1 },
    targetRpe: { type: ['number', 'null'], minimum: 0, maximum: 10 },
    targetWeightKg: { type: ['number', 'null'], minimum: 0 },
  },
  required: [
    'exerciseId',
    'exerciseName',
    'targetSets',
    'targetRepsMin',
    'targetRepsMax',
    'targetRpe',
    'targetWeightKg',
  ],
  additionalProperties: false,
}

const DAY_SCHEMA = {
  type: 'object',
  properties: {
    dayOfWeek: { type: 'integer', minimum: 1, maximum: 7 },
    dayType: { type: 'string', enum: ['training', 'rest'] },
    exercises: { type: 'array', items: EXERCISE_SCHEMA },
  },
  required: ['dayOfWeek', 'dayType', 'exercises'],
  additionalProperties: false,
}

const PROGRAM_PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    programName: { type: 'string' },
    focus: { type: 'string', enum: ['force', 'hypertrophie', 'endurance'] },
    rationale: { type: 'string' },
    days: { type: 'array', minItems: 7, maxItems: 7, items: DAY_SCHEMA },
  },
  required: ['programName', 'focus', 'rationale', 'days'],
  additionalProperties: false,
}

function buildUserMessage(input: GenerateProgramInput): string {
  return [
    `Profil de l'utilisateur (JSON) :\n${JSON.stringify(input.profileContext)}`,
    `Exercices disponibles, à choisir exclusivement dans cette liste (JSON) :\n${JSON.stringify(input.availableExercises)}`,
    `Jours d'entraînement souhaités par semaine : ${input.daysPerWeek}`,
    `Équipement disponible indiqué par l'utilisateur : ${input.equipment || 'non précisé'}`,
    `Contraintes ou préférences indiquées par l'utilisateur : ${input.constraints || 'aucune'}`,
  ].join('\n\n')
}

// Validates the model's own claims (exercise IDs actually in the allowed
// pool, rep ranges internally consistent, day count) before this ever
// reaches the client — a model can still violate its instructions despite
// a constrained schema, the schema only guarantees *shape*, not that the
// referenced IDs are real.
function validateProposal(proposal: ProgramProposal, allowedExerciseIds: Set<string>): void {
  if (proposal.days.length !== 7) {
    throw new Error('Le programme proposé ne couvre pas exactement 7 jours.')
  }
  const seenDays = new Set<number>()
  for (const day of proposal.days) {
    if (day.dayOfWeek < 1 || day.dayOfWeek > 7) {
      throw new Error(`Jour invalide proposé : ${day.dayOfWeek}.`)
    }
    seenDays.add(day.dayOfWeek)
    for (const exercise of day.exercises) {
      if (!allowedExerciseIds.has(exercise.exerciseId)) {
        throw new Error(`Exercice proposé hors de la liste autorisée : ${exercise.exerciseName}.`)
      }
      if (exercise.targetRepsMax < exercise.targetRepsMin) {
        throw new Error(`Fourchette de répétitions incohérente pour ${exercise.exerciseName}.`)
      }
    }
  }
  if (seenDays.size !== 7) {
    throw new Error('Le programme proposé ne couvre pas les 7 jours de la semaine une seule fois chacun.')
  }
}

interface AnthropicToolUseBlock {
  type: string
  input?: unknown
}

async function callAnthropic(
  apiKey: string,
  input: GenerateProgramInput,
): Promise<ProgramProposal> {
  // No `thinking` here, deliberately — Anthropic's extended thinking is
  // incompatible with a forced tool_choice (the model must be free to
  // decide whether to think before committing to a tool call), and a
  // forced tool_choice is what makes the structured output reliable enough
  // to trust without a human re-typing it. Trend analysis (free-form text)
  // uses thinking; this one trades that off for schema reliability instead.
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      system: PROGRAM_GENERATION_SYSTEM_PROMPT,
      tools: [
        {
          name: 'propose_program',
          description: 'Propose un programme d\'entraînement structuré sur 7 jours.',
          input_schema: PROGRAM_PROPOSAL_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'propose_program' },
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
  if (!toolUse?.input) throw new Error('Le modèle n\'a pas renvoyé de programme structuré.')
  return toolUse.input as ProgramProposal
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[]
}

async function callOpenAi(
  apiKey: string,
  input: GenerateProgramInput,
): Promise<ProgramProposal> {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.6',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: PROGRAM_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(input) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'propose_program',
          strict: true,
          schema: PROGRAM_PROPOSAL_SCHEMA,
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
  if (!content) throw new Error('Le modèle n\'a pas renvoyé de programme structuré.')
  return JSON.parse(content) as ProgramProposal
}

export async function generateProgram(
  provider: AiProvider,
  apiKey: string,
  input: GenerateProgramInput,
): Promise<ProgramProposal> {
  const proposal =
    provider === 'anthropic' ? await callAnthropic(apiKey, input) : await callOpenAi(apiKey, input)
  validateProposal(proposal, new Set(input.availableExercises.map((e) => e.id)))
  return proposal
}
