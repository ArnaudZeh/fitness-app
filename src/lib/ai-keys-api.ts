import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type AiProvider = 'anthropic' | 'openai'

type AiProviderKeyRow = Database['public']['Tables']['ai_provider_keys']['Row']

export interface AiProviderKeyStatus {
  provider: AiProvider
  is_valid: boolean
  last_validated_at: string | null
}

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI (ChatGPT)',
}

export const AI_PROVIDERS: AiProvider[] = ['anthropic', 'openai']

function toStatus(
  row: Pick<AiProviderKeyRow, 'provider' | 'is_valid' | 'last_validated_at'>,
): AiProviderKeyStatus {
  return {
    provider: row.provider as AiProvider,
    is_valid: row.is_valid,
    last_validated_at: row.last_validated_at,
  }
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchAiProviderKeyStatuses(): Promise<AiProviderKeyStatus[]> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('ai_provider_keys')
    .select('provider, is_valid, last_validated_at')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map(toStatus)
}

async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      try {
        const body = (await context.json()) as { error?: string }
        if (body.error) return body.error
      } catch {
        // Response body wasn't JSON — fall through to the generic message.
      }
    }
  }
  return error instanceof Error ? error.message : 'Une erreur est survenue.'
}

async function invokeAiKeyFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const result = await supabase.functions.invoke<T>(name, { body })
  if (result.error) throw new Error(await extractFunctionErrorMessage(result.error))
  if (result.data === null) throw new Error('Réponse vide du serveur.')
  return result.data
}

export async function saveAiProviderKey(
  provider: AiProvider,
  apiKey: string,
): Promise<AiProviderKeyStatus> {
  return invokeAiKeyFunction<AiProviderKeyStatus>('ai-key-save', { provider, apiKey })
}

export async function testAiProviderKey(
  provider: AiProvider,
): Promise<AiProviderKeyStatus> {
  return invokeAiKeyFunction<AiProviderKeyStatus>('ai-key-test', { provider })
}

export async function deleteAiProviderKey(provider: AiProvider): Promise<void> {
  await invokeAiKeyFunction<{ provider: AiProvider; deleted: boolean }>('ai-key-delete', {
    provider,
  })
}
