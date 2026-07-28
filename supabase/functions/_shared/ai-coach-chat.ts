import type { AiProvider } from './provider-validation.ts'
import { COACH_CHAT_SYSTEM_PROMPT } from './coach-persona.ts'
import { fetchWithTimeout } from './fetch-with-timeout.ts'
import { analyzeTrends } from './ai-analysis.ts'
import { generateProgram, type ProgramProposal } from './ai-program-generation.ts'
import { adaptSession, type CurrentExercise, type SessionAdaptationProposal } from './ai-session-adaptation.ts'

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ProgramDaySnapshot {
  dayOfWeek: number
  dayType: 'training' | 'rest'
  sessionTemplateId: string
  focus: 'force' | 'hypertrophie' | 'endurance'
  exercises: CurrentExercise[]
}

export interface TodayContext {
  isoDate: string
  dayOfWeek: number
}

export interface CoachChatInput {
  message: string
  conversationHistory: ConversationMessage[]
  profileContext: unknown
  trendSummary: unknown
  programStructure: ProgramDaySnapshot[]
  availableExercises: { id: string; name: string; muscleGroup: string | null }[]
  today: TodayContext
}

export type CoachChatProposal =
  | { type: 'generer_programme'; proposal: ProgramProposal }
  | {
      type: 'adapter_seance'
      sessionTemplateId: string
      focus: 'force' | 'hypertrophie' | 'endurance'
      proposal: SessionAdaptationProposal
    }

export interface CoachChatResult {
  message: string
  proposal: CoachChatProposal | null
}

// additionalProperties:false on every schema for OpenAI strict-mode
// compatibility, harmless for Anthropic — same convention as the other two
// couche IA tool schemas.
const ANALYZE_TOOL_SCHEMA = { type: 'object', properties: {}, required: [], additionalProperties: false }

const GENERATE_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    daysPerWeek: { type: 'integer', minimum: 1, maximum: 7 },
    equipment: { type: 'string' },
    constraints: { type: 'string' },
  },
  required: ['daysPerWeek', 'equipment', 'constraints'],
  additionalProperties: false,
}

const ADAPT_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    dayOfWeek: { type: 'integer', minimum: 1, maximum: 7 },
    dayContext: { type: 'string' },
  },
  required: ['dayOfWeek', 'dayContext'],
  additionalProperties: false,
}

const ANALYZE_TOOL_NAME = 'analyser_tendance'
const GENERATE_TOOL_NAME = 'generer_programme'
const ADAPT_TOOL_NAME = 'adapter_seance'
const ANALYZE_TOOL_DESCRIPTION =
  "Analyse les données d'entraînement récentes déjà fournies (tonnage, régularité, progression) et retourne une analyse. N'écrit rien."
const GENERATE_TOOL_DESCRIPTION =
  "Propose un nouveau programme d'entraînement structuré sur 7 jours. Ne l'applique pas, juste une proposition."
const ADAPT_TOOL_DESCRIPTION =
  "Propose une adaptation d'une séance déjà planifiée dans le programme actif, pour un jour de la semaine donné (1=lundi ... 7=dimanche). Ne l'applique pas, juste une proposition."

function buildContextMessage(input: CoachChatInput): string {
  return [
    `Date et jour actuels : ${input.today.isoDate}, jour ${input.today.dayOfWeek} (1=lundi ... 7=dimanche) — utilise ceci pour résoudre toute référence relative de l'utilisateur ("aujourd'hui", "demain", "après-demain", etc.) en un jour concret.`,
    `Profil de l'utilisateur (JSON) :\n${JSON.stringify(input.profileContext)}`,
    `Données de régularité et de tonnage récentes (JSON) :\n${JSON.stringify(input.trendSummary)}`,
    `Programme actif de l'utilisateur, un objet par jour de la semaine (JSON, vide si aucun programme actif) :\n${JSON.stringify(input.programStructure)}`,
    `Exercices déjà pratiqués par l'utilisateur, seuls exercices utilisables par generer_programme/adapter_seance (JSON) :\n${JSON.stringify(input.availableExercises)}`,
    `Message de l'utilisateur : ${input.message}`,
  ].join('\n\n')
}

interface GenerateToolArgs {
  daysPerWeek: number
  equipment: string
  constraints: string
}

interface AdaptToolArgs {
  dayOfWeek: number
  dayContext: string
}

async function runGenerateTool(
  provider: AiProvider,
  apiKey: string,
  input: CoachChatInput,
  args: GenerateToolArgs,
): Promise<CoachChatResult> {
  const daysPerWeek = Math.min(7, Math.max(1, Math.round(args.daysPerWeek)))
  const proposal = await generateProgram(provider, apiKey, {
    profileContext: input.profileContext,
    availableExercises: input.availableExercises,
    daysPerWeek,
    equipment: args.equipment ?? '',
    constraints: args.constraints ?? '',
  })
  // No exercise pool to draw from (e.g. nothing logged yet) means the model
  // correctly leaves every day empty rather than inventing exercises — but
  // an empty program isn't a usable proposal, just a dead-end "create"
  // button. Surface the model's own explanation as plain text instead.
  const hasAnyExercise = proposal.days.some((day) => day.exercises.length > 0)
  if (!hasAnyExercise) {
    return { message: proposal.rationale, proposal: null }
  }
  return {
    message: `Voici une proposition de programme : « ${proposal.programName} ». ${proposal.rationale}`,
    proposal: { type: 'generer_programme', proposal },
  }
}

async function runAdaptTool(
  provider: AiProvider,
  apiKey: string,
  input: CoachChatInput,
  args: AdaptToolArgs,
): Promise<CoachChatResult> {
  const dayOfWeek = Math.round(args.dayOfWeek)
  const day = input.programStructure.find((d) => d.dayOfWeek === dayOfWeek)
  if (!day || day.dayType !== 'training' || day.exercises.length === 0) {
    return {
      message:
        "Je ne trouve pas de séance d'entraînement pour ce jour-là dans ton programme actif. Dis-moi quel jour tu veux adapter, ou crée d'abord un programme.",
      proposal: null,
    }
  }
  const proposal = await adaptSession(provider, apiKey, {
    profileContext: input.profileContext,
    trendSummary: input.trendSummary,
    currentExercises: day.exercises,
    availableExercises: input.availableExercises,
    dayContext: args.dayContext ?? '',
  })
  return {
    message: `Voici une proposition d'adaptation pour cette séance. ${proposal.rationale}`,
    proposal: {
      type: 'adapter_seance',
      sessionTemplateId: day.sessionTemplateId,
      focus: day.focus,
      proposal,
    },
  }
}

interface AnthropicBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: unknown
}

async function callAnthropicMessages(
  apiKey: string,
  systemPrompt: string,
  messages: unknown[],
  tools: unknown[],
): Promise<{ stopReason: string; blocks: AnthropicBlock[] }> {
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
      system: systemPrompt,
      // tool_choice stays "auto" here (unlike program generation/session
      // adaptation, which force a tool) — the assistant must be free to
      // just answer in text for most messages, which is also what makes
      // `thinking` usable here: Anthropic's extended thinking needs
      // tool_choice:auto, it's incompatible with a forced tool choice.
      thinking: { type: 'adaptive' },
      tools,
      tool_choice: { type: 'auto' },
      messages,
    }),
  })
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Anthropic a répondu avec une erreur (${response.status}) : ${errorBody.slice(0, 200)}`,
    )
  }
  const data = (await response.json()) as { stop_reason?: string; content?: AnthropicBlock[] }
  return { stopReason: data.stop_reason ?? '', blocks: data.content ?? [] }
}

async function runAnthropicChat(
  provider: AiProvider,
  apiKey: string,
  input: CoachChatInput,
): Promise<CoachChatResult> {
  const tools = [
    { name: ANALYZE_TOOL_NAME, description: ANALYZE_TOOL_DESCRIPTION, input_schema: ANALYZE_TOOL_SCHEMA },
    { name: GENERATE_TOOL_NAME, description: GENERATE_TOOL_DESCRIPTION, input_schema: GENERATE_TOOL_SCHEMA },
    { name: ADAPT_TOOL_NAME, description: ADAPT_TOOL_DESCRIPTION, input_schema: ADAPT_TOOL_SCHEMA },
  ]
  const messages: unknown[] = [
    ...input.conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: buildContextMessage(input) },
  ]

  const first = await callAnthropicMessages(apiKey, COACH_CHAT_SYSTEM_PROMPT, messages, tools)
  const toolUse = first.blocks.find((block) => block.type === 'tool_use')

  if (first.stopReason !== 'tool_use' || !toolUse) {
    const text = first.blocks
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n')
      .trim()
    return { message: text || "Je n'ai pas de réponse à te proposer pour l'instant.", proposal: null }
  }

  if (toolUse.name === GENERATE_TOOL_NAME) {
    return runGenerateTool(provider, apiKey, input, toolUse.input as GenerateToolArgs)
  }
  if (toolUse.name === ADAPT_TOOL_NAME) {
    return runAdaptTool(provider, apiKey, input, toolUse.input as AdaptToolArgs)
  }
  if (toolUse.name === ANALYZE_TOOL_NAME) {
    const analysis = await analyzeTrends(provider, apiKey, input.trendSummary, input.profileContext)
    // Anthropic requires the full prior assistant turn (including any
    // thinking blocks) to be replayed verbatim before a tool_result, or the
    // thinking-block signature invariant breaks — so we pass `first.blocks`
    // straight through rather than reconstructing a trimmed-down version.
    const second = await callAnthropicMessages(
      apiKey,
      COACH_CHAT_SYSTEM_PROMPT,
      [
        ...messages,
        { role: 'assistant', content: first.blocks },
        {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: analysis }],
        },
      ],
      [],
    )
    const text = second.blocks
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n')
      .trim()
    return { message: text || analysis, proposal: null }
  }

  return { message: "Je n'ai pas compris cette demande, tu peux la reformuler ?", proposal: null }
}

interface OpenAiToolCall {
  id: string
  type: string
  function: { name: string; arguments: string }
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string | null; tool_calls?: OpenAiToolCall[] } }[]
}

async function callOpenAiChat(
  apiKey: string,
  messages: unknown[],
  tools: unknown[],
): Promise<{ content: string | null; toolCalls: OpenAiToolCall[] }> {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.6',
      // gpt-5.6 rejects the legacy max_tokens param (400 invalid_request_error) —
      // OpenAI requires max_completion_tokens on newer models.
      max_completion_tokens: 2048,
      messages,
      ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
    }),
  })
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `OpenAI a répondu avec une erreur (${response.status}) : ${errorBody.slice(0, 200)}`,
    )
  }
  const data = (await response.json()) as OpenAiChatResponse
  const message = data.choices?.[0]?.message
  return { content: message?.content ?? null, toolCalls: message?.tool_calls ?? [] }
}

async function runOpenAiChat(
  provider: AiProvider,
  apiKey: string,
  input: CoachChatInput,
): Promise<CoachChatResult> {
  const tools = [
    {
      type: 'function',
      function: {
        name: ANALYZE_TOOL_NAME,
        description: ANALYZE_TOOL_DESCRIPTION,
        parameters: ANALYZE_TOOL_SCHEMA,
        strict: true,
      },
    },
    {
      type: 'function',
      function: {
        name: GENERATE_TOOL_NAME,
        description: GENERATE_TOOL_DESCRIPTION,
        parameters: GENERATE_TOOL_SCHEMA,
        strict: true,
      },
    },
    {
      type: 'function',
      function: {
        name: ADAPT_TOOL_NAME,
        description: ADAPT_TOOL_DESCRIPTION,
        parameters: ADAPT_TOOL_SCHEMA,
        strict: true,
      },
    },
  ]
  const messages: unknown[] = [
    { role: 'system', content: COACH_CHAT_SYSTEM_PROMPT },
    ...input.conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: buildContextMessage(input) },
  ]

  const first = await callOpenAiChat(apiKey, messages, tools)
  const toolCall = first.toolCalls[0]

  if (!toolCall) {
    return {
      message: first.content?.trim() || "Je n'ai pas de réponse à te proposer pour l'instant.",
      proposal: null,
    }
  }

  if (toolCall.function.name === GENERATE_TOOL_NAME) {
    const args = JSON.parse(toolCall.function.arguments) as GenerateToolArgs
    return runGenerateTool(provider, apiKey, input, args)
  }
  if (toolCall.function.name === ADAPT_TOOL_NAME) {
    const args = JSON.parse(toolCall.function.arguments) as AdaptToolArgs
    return runAdaptTool(provider, apiKey, input, args)
  }
  if (toolCall.function.name === ANALYZE_TOOL_NAME) {
    const analysis = await analyzeTrends(provider, apiKey, input.trendSummary, input.profileContext)
    const second = await callOpenAiChat(
      apiKey,
      [
        ...messages,
        { role: 'assistant', content: null, tool_calls: [toolCall] },
        { role: 'tool', tool_call_id: toolCall.id, content: analysis },
      ],
      [],
    )
    return { message: second.content?.trim() || analysis, proposal: null }
  }

  return { message: "Je n'ai pas compris cette demande, tu peux la reformuler ?", proposal: null }
}

export async function runCoachChat(
  provider: AiProvider,
  apiKey: string,
  input: CoachChatInput,
): Promise<CoachChatResult> {
  return provider === 'anthropic'
    ? runAnthropicChat(provider, apiKey, input)
    : runOpenAiChat(provider, apiKey, input)
}
