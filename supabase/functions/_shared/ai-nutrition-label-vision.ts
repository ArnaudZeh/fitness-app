import type { AiProvider } from './provider-validation.ts'
import { fetchWithTimeout } from './fetch-with-timeout.ts'

// Deliberately its own narrow system prompt, not COACH_PERSONA-based (see
// coach-persona.ts) — this is a mechanical vision-extraction task with no
// coaching tone/guardrails to apply, closer in spirit to EXERCISE_SCHEMA's
// pure structure than to a coach feature.
const NUTRITION_LABEL_SYSTEM_PROMPT = `
Tu lis une photo d'étiquette de valeurs nutritionnelles (française "Valeurs nutritionnelles" ou anglaise "Nutrition Facts") et tu en extrais les chiffres exacts, sans jamais inventer une valeur absente ou illisible.

Règles strictes :
- Utilise toujours la colonne "pour 100g" ou "pour 100ml" si elle est présente sur l'étiquette, jamais la colonne "par portion" quand les deux existent.
- Si seule une valeur par portion est indiquée (pas de colonne pour 100g/100ml), et que la taille de la portion est lisible sur l'étiquette, calcule toi-même l'équivalent pour 100g/100ml à partir de cette taille de portion.
- Si les calories ne sont indiquées qu'en kJ (kilojoules), convertis en kcal en divisant par 4.184.
- Si la photo n'est pas une étiquette de valeurs nutritionnelles lisible (mauvais angle, flou, pas une étiquette du tout, valeurs illisibles), réponds extracted:false et laisse tous les autres champs à null plutôt que d'inventer des chiffres plausibles.
- Le nom du produit n'est pas toujours visible sur une photo cadrée sur l'étiquette seule : laisse name à null si tu ne peux pas le lire avec certitude, ne devine jamais un nom à partir du type d'aliment supposé.
- Arrondis les calories à l'entier et les macros à une décimale.
`.trim()

export interface NutritionLabelExtraction {
  extracted: boolean
  name: string | null
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
}

// additionalProperties:false + every property in "required" for OpenAI's
// strict structured-output mode, same convention as PROGRAM_PROPOSAL_SCHEMA.
const NUTRITION_LABEL_SCHEMA = {
  type: 'object',
  properties: {
    extracted: { type: 'boolean' },
    name: { type: ['string', 'null'] },
    caloriesPer100g: { type: ['number', 'null'] },
    proteinPer100g: { type: ['number', 'null'] },
    carbsPer100g: { type: ['number', 'null'] },
    fatPer100g: { type: ['number', 'null'] },
  },
  required: [
    'extracted',
    'name',
    'caloriesPer100g',
    'proteinPer100g',
    'carbsPer100g',
    'fatPer100g',
  ],
  additionalProperties: false,
}

const USER_TEXT =
  "Analyse cette photo d'étiquette nutritionnelle et extrais les valeurs demandées."

function validateExtraction(extraction: NutritionLabelExtraction): void {
  if (extraction.extracted && extraction.caloriesPer100g === null) {
    throw new Error("Le modèle a signalé une extraction réussie sans valeur de calories.")
  }
}

interface AnthropicToolUseBlock {
  type: string
  input?: unknown
}

async function callAnthropic(
  apiKey: string,
  base64Image: string,
): Promise<NutritionLabelExtraction> {
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: NUTRITION_LABEL_SYSTEM_PROMPT,
      tools: [
        {
          name: 'extract_nutrition_label',
          description: "Extrait les valeurs nutritionnelles lues sur l'étiquette photographiée.",
          input_schema: NUTRITION_LABEL_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'extract_nutrition_label' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
            },
            { type: 'text', text: USER_TEXT },
          ],
        },
      ],
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
  if (!toolUse?.input) throw new Error("Le modèle n'a pas renvoyé d'extraction structurée.")
  return toolUse.input as NutritionLabelExtraction
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[]
}

async function callOpenAi(
  apiKey: string,
  base64Image: string,
): Promise<NutritionLabelExtraction> {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.6',
      max_completion_tokens: 1024,
      messages: [
        { role: 'system', content: NUTRITION_LABEL_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: USER_TEXT },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'extract_nutrition_label',
          strict: true,
          schema: NUTRITION_LABEL_SCHEMA,
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
  if (!content) throw new Error("Le modèle n'a pas renvoyé d'extraction structurée.")
  return JSON.parse(content) as NutritionLabelExtraction
}

// base64Image is the raw base64 payload (no "data:image/jpeg;base64," prefix
// — each provider call site adds whatever wrapping it individually needs).
export async function analyzeNutritionLabel(
  provider: AiProvider,
  apiKey: string,
  base64Image: string,
): Promise<NutritionLabelExtraction> {
  const extraction =
    provider === 'anthropic'
      ? await callAnthropic(apiKey, base64Image)
      : await callOpenAi(apiKey, base64Image)
  validateExtraction(extraction)
  return extraction
}
