import type { AiProvider } from './provider-validation.ts'
import { TREND_ANALYSIS_SYSTEM_PROMPT } from './coach-persona.ts'
import { fetchWithTimeout } from './fetch-with-timeout.ts'

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
      model: 'claude-sonnet-5',
      max_tokens: 1536,
      system: TREND_ANALYSIS_SYSTEM_PROMPT,
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
        { role: 'system', content: TREND_ANALYSIS_SYSTEM_PROMPT },
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

// summary and profileContext are already compact, pre-aggregated JSON
// objects (built client-side, from the same pure functions the app itself
// uses for Analytics/Profile) — this function only relays them to the
// provider, it never queries user data itself.
export async function analyzeTrends(
  provider: AiProvider,
  apiKey: string,
  summary: unknown,
  profileContext: unknown,
): Promise<string> {
  const userMessage = [
    `Profil de l'utilisateur (JSON) :\n${JSON.stringify(profileContext)}`,
    `Données d'entraînement récentes (JSON) :\n${JSON.stringify(summary)}`,
  ].join('\n\n')
  return provider === 'anthropic'
    ? callAnthropic(apiKey, userMessage)
    : callOpenAi(apiKey, userMessage)
}
