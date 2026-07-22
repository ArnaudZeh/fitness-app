import { corsHeaders } from '../_shared/cors.ts'
import { isResponse, jsonResponse, requireAuthedContext } from '../_shared/http.ts'
import { type AiProvider, validateProviderKey } from '../_shared/provider-validation.ts'

// Re-validates an already-stored key (e.g. after the user suspects it was
// revoked) without requiring them to paste it again.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const ctx = await requireAuthedContext(req)
  if (isResponse(ctx)) return ctx
  const { userId, admin } = ctx

  let body: { provider?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corps de requête invalide.' }, 400)
  }
  const provider = body.provider
  if (provider !== 'anthropic' && provider !== 'openai') {
    return jsonResponse({ error: 'Provider invalide.' }, 400)
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
  if (!existing) {
    return jsonResponse({ error: 'Aucune clé enregistrée pour ce provider.' }, 404)
  }

  const { data: secretValue, error: secretError } = await admin.rpc(
    'ai_vault_read_secret',
    {
      p_id: existing.vault_secret_id,
    },
  )
  if (secretError || typeof secretValue !== 'string') {
    console.error(secretError)
    return jsonResponse({ error: 'Erreur serveur.' }, 500)
  }

  const validation = await validateProviderKey(provider as AiProvider, secretValue)
  const now = new Date().toISOString()

  const { error: updateError } = await admin
    .from('ai_provider_keys')
    .update({ is_valid: validation.valid, last_validated_at: now })
    .eq('id', existing.id)
  if (updateError) {
    console.error(updateError)
    return jsonResponse({ error: 'Erreur serveur.' }, 500)
  }

  if (!validation.valid) {
    return jsonResponse({ error: validation.errorMessage ?? 'Clé invalide.' }, 422)
  }
  return jsonResponse({ provider, is_valid: true, last_validated_at: now })
})
