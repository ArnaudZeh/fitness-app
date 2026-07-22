export type AiProvider = 'anthropic' | 'openai'

export interface ValidationResult {
  valid: boolean
  errorMessage?: string
}

const FETCH_TIMEOUT_MS = 10_000

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

// Both providers expose a zero-cost "list models" endpoint that only checks
// auth — no completion tokens spent just to validate a key works.
export async function validateProviderKey(
  provider: AiProvider,
  apiKey: string,
): Promise<ValidationResult> {
  try {
    const response =
      provider === 'anthropic'
        ? await fetchWithTimeout('https://api.anthropic.com/v1/models', {
            method: 'GET',
            headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          })
        : await fetchWithTimeout('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: { Authorization: `Bearer ${apiKey}` },
          })

    if (response.ok) return { valid: true }

    const providerLabel = provider === 'anthropic' ? 'Anthropic' : 'OpenAI'
    if (response.status === 401 || response.status === 403) {
      return { valid: false, errorMessage: `Clé ${providerLabel} invalide ou révoquée.` }
    }
    return {
      valid: false,
      errorMessage: `${providerLabel} a répondu avec une erreur (${response.status}).`,
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { valid: false, errorMessage: "Le fournisseur n'a pas répondu à temps." }
    }
    return { valid: false, errorMessage: 'Impossible de contacter le fournisseur.' }
  }
}
