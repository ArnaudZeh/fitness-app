import type { AiProvider } from './provider-validation.ts'
import { NUTRITION_ADJUSTMENT_SYSTEM_PROMPT } from './coach-persona.ts'
import { fetchWithTimeout } from './fetch-with-timeout.ts'

export interface NutritionAdjustmentProposal {
  rationale: string
  caloriesTarget: number
  proteinGTarget: number
  carbsGTarget: number
  fatGTarget: number
}

export interface AdjustNutritionInput {
  profileContext: unknown
  userContext: string
}

const NUTRITION_ADJUSTMENT_SCHEMA = {
  type: 'object',
  properties: {
    rationale: { type: 'string' },
    caloriesTarget: { type: 'number' },
    proteinGTarget: { type: 'number' },
    carbsGTarget: { type: 'number' },
    fatGTarget: { type: 'number' },
  },
  required: ['rationale', 'caloriesTarget', 'proteinGTarget', 'carbsGTarget', 'fatGTarget'],
  additionalProperties: false,
}

function buildUserMessage(input: AdjustNutritionInput): string {
  return [
    `Profil de l'utilisateur, y compris ses cibles nutritionnelles actuelles et sa consommation récente (champ "nutrition") (JSON) :\n${JSON.stringify(input.profileContext)}`,
    `Contexte donné par l'utilisateur pour cet ajustement : ${input.userContext || 'aucun'}`,
  ].join('\n\n')
}

// Hard safety rails, enforced server-side regardless of what the model was
// instructed to respect in the prompt — same "schema only guarantees shape,
// not that the model followed instructions" philosophy as
// validateAdaptation() in ai-session-adaptation.ts. 1200 kcal is the
// commonly cited floor below which a deficit needs medical supervision;
// 6000 kcal is a generous ceiling no legitimate target in this app should
// ever exceed, there purely to catch a hallucinated number.
const MIN_SAFE_CALORIES = 1200
const MAX_SAFE_CALORIES = 6000
const KCAL_PER_G_PROTEIN = 4
const KCAL_PER_G_CARBS = 4
const KCAL_PER_G_FAT = 9
const CALORIE_MACRO_TOLERANCE = 0.05

function validateAdjustment(proposal: NutritionAdjustmentProposal): void {
  const { caloriesTarget, proteinGTarget, carbsGTarget, fatGTarget } = proposal
  if (
    caloriesTarget <= 0 ||
    proteinGTarget <= 0 ||
    carbsGTarget <= 0 ||
    fatGTarget <= 0
  ) {
    throw new Error('Cibles nutritionnelles invalides (valeur négative ou nulle).')
  }
  if (caloriesTarget < MIN_SAFE_CALORIES) {
    throw new Error(
      `Cible calorique trop basse (${caloriesTarget} kcal, minimum ${MIN_SAFE_CALORIES} kcal).`,
    )
  }
  if (caloriesTarget > MAX_SAFE_CALORIES) {
    throw new Error(
      `Cible calorique irréaliste (${caloriesTarget} kcal, maximum ${MAX_SAFE_CALORIES} kcal).`,
    )
  }
  const caloriesFromMacros =
    proteinGTarget * KCAL_PER_G_PROTEIN + carbsGTarget * KCAL_PER_G_CARBS + fatGTarget * KCAL_PER_G_FAT
  const deviation = Math.abs(caloriesFromMacros - caloriesTarget) / caloriesTarget
  if (deviation > CALORIE_MACRO_TOLERANCE) {
    throw new Error(
      `Calories incohérentes avec les macros proposées (${caloriesTarget} kcal vs ${Math.round(caloriesFromMacros)} kcal calculé).`,
    )
  }
}

interface AnthropicToolUseBlock {
  type: string
  input?: unknown
}

async function callAnthropic(
  apiKey: string,
  input: AdjustNutritionInput,
): Promise<NutritionAdjustmentProposal> {
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1536,
      system: NUTRITION_ADJUSTMENT_SYSTEM_PROMPT,
      tools: [
        {
          name: 'adjust_nutrition_targets',
          description: 'Propose un ajustement des cibles nutritionnelles.',
          input_schema: NUTRITION_ADJUSTMENT_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'adjust_nutrition_targets' },
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
  if (!toolUse?.input) throw new Error("Le modèle n'a pas renvoyé d'ajustement structuré.")
  return toolUse.input as NutritionAdjustmentProposal
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[]
}

async function callOpenAi(
  apiKey: string,
  input: AdjustNutritionInput,
): Promise<NutritionAdjustmentProposal> {
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
      max_completion_tokens: 1536,
      messages: [
        { role: 'system', content: NUTRITION_ADJUSTMENT_SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(input) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'adjust_nutrition_targets',
          strict: true,
          schema: NUTRITION_ADJUSTMENT_SCHEMA,
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
  if (!content) throw new Error("Le modèle n'a pas renvoyé d'ajustement structuré.")
  return JSON.parse(content) as NutritionAdjustmentProposal
}

export async function adjustNutritionTargets(
  provider: AiProvider,
  apiKey: string,
  input: AdjustNutritionInput,
): Promise<NutritionAdjustmentProposal> {
  const proposal =
    provider === 'anthropic' ? await callAnthropic(apiKey, input) : await callOpenAi(apiKey, input)
  validateAdjustment(proposal)
  return proposal
}
