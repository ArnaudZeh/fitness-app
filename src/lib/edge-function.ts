import { supabase } from '@/lib/supabase'

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

export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const result = await supabase.functions.invoke<T>(name, { body })
  if (result.error) throw new Error(await extractFunctionErrorMessage(result.error))
  if (result.data === null) throw new Error('Réponse vide du serveur.')
  return result.data
}
