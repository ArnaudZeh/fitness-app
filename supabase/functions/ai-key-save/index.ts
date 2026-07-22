import { corsHeaders } from '../_shared/cors.ts'
import { isResponse, jsonResponse, requireAuthedContext } from '../_shared/http.ts'
import { type AiProvider, validateProviderKey } from '../_shared/provider-validation.ts'

const PROVIDERS: AiProvider[] = ['anthropic', 'openai']
const MAX_KEY_LENGTH = 512

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const ctx = await requireAuthedContext(req)
  if (isResponse(ctx)) return ctx
  const { userId, admin } = ctx

  let body: { provider?: string; apiKey?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corps de requête invalide.' }, 400)
  }

  const provider = body.provider
  const apiKey = body.apiKey?.trim()

  if (!provider || !PROVIDERS.includes(provider as AiProvider)) {
    return jsonResponse({ error: 'Provider invalide.' }, 400)
  }
  if (!apiKey || apiKey.length > MAX_KEY_LENGTH) {
    return jsonResponse({ error: 'Clé API invalide.' }, 400)
  }

  const validation = await validateProviderKey(provider as AiProvider, apiKey)
  if (!validation.valid) {
    return jsonResponse({ error: validation.errorMessage ?? 'Clé invalide.' }, 422)
  }

  const { data: existing, error: existingError } = await admin
    .from('ai_provider_keys')
    .select('id, vault_secret_id')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()
  if (existingError) {
    console.error(existingError)
    return jsonResponse({ error: 'Erreur serveur.' }, 500)
  }

  const now = new Date().toISOString()

  if (existing) {
    const { error: updateSecretError } = await admin.rpc('ai_vault_update_secret', {
      p_id: existing.vault_secret_id,
      p_secret: apiKey,
    })
    if (updateSecretError) {
      console.error(updateSecretError)
      return jsonResponse({ error: 'Erreur serveur.' }, 500)
    }
    const { error: updateRowError } = await admin
      .from('ai_provider_keys')
      .update({ is_valid: true, last_validated_at: now })
      .eq('id', existing.id)
    if (updateRowError) {
      console.error(updateRowError)
      return jsonResponse({ error: 'Erreur serveur.' }, 500)
    }
  } else {
    const secretName = `ai-key-${userId}-${provider}`
    const { data: secretId, error: createSecretError } = await admin.rpc(
      'ai_vault_create_secret',
      { p_secret: apiKey, p_name: secretName },
    )
    if (createSecretError || !secretId) {
      console.error(createSecretError)
      return jsonResponse({ error: 'Erreur serveur.' }, 500)
    }
    const { error: insertError } = await admin.from('ai_provider_keys').insert({
      user_id: userId,
      provider,
      vault_secret_id: secretId as string,
      is_valid: true,
      last_validated_at: now,
    })
    if (insertError) {
      console.error(insertError)
      return jsonResponse({ error: 'Erreur serveur.' }, 500)
    }
  }

  return jsonResponse({ provider, is_valid: true, last_validated_at: now })
})
