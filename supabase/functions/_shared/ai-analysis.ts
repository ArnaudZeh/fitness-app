import type { AiProvider } from './provider-validation.ts'

const FETCH_TIMEOUT_MS = 45_000

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

const SYSTEM_PROMPT = [
  "Tu es un coach de musculation qui analyse les données d'entraînement d'un utilisateur.",
  'Réponds en français, en 3 à 5 phrases ou quelques points clés maximum — concis, factuel,',
  'bienveillant. Base-toi uniquement sur les données fournies (JSON : tonnage hebdomadaire,',
  'nombre de séances cette semaine, progression du 1RM estimé par exercice). Signale les',
  'tendances notables (progression, plateau, baisse de régularité) et termine par une seule',
  'suggestion concrète. Ne donne aucun avis médical.',
].join(' ')

interface AnthropicContentBlock {
  type: string
  text?: string
}

async function callAnthropic(apiKey: string, userMessage: string): Promise<string> {
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 1536,
      system: SYSTEM_PROMPT,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Anthropic a répondu avec une erreur (${response.status}) : ${errorBody.slice(0, 200)}`,
    )
  }
  const data = (await response.json()) as { content?: AnthropicContentBlock[] }
  const text = (data.content ?? [])
    .filter((block) => block.type === 'text' && block.text)
    .map((block) => block.text)
    .join('\n')
    .trim()
  if (!text) throw new Error('Réponse vide du modèle.')
  return text
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[]
}

async function callOpenAi(apiKey: string, userMessage: string): Promise<string> {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.6',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  })
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `OpenAI a répondu avec une erreur (${response.status}) : ${errorBody.slice(0, 200)}`,
    )
  }
  const data = (await response.json()) as OpenAiChatResponse
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Réponse vide du modèle.')
  return text
}

// summary is already a compact, pre-aggregated JSON object (built client-side
// from the same pure functions the Analytics page charts from) — this
// function only relays it to the provider, it never queries training data
// itself.
export async function analyzeTrends(
  provider: AiProvider,
  apiKey: string,
  summary: unknown,
): Promise<string> {
  const userMessage = `Voici mes données d'entraînement récentes (JSON) :\n${JSON.stringify(summary)}`
  return provider === 'anthropic'
    ? callAnthropic(apiKey, userMessage)
    : callOpenAi(apiKey, userMessage)
}
