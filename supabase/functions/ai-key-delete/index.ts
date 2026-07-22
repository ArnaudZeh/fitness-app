import { corsHeaders } from '../_shared/cors.ts'
import { isResponse, jsonResponse, requireAuthedContext } from '../_shared/http.ts'

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
    .select('vault_secret_id')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()
  if (existingError) {
    console.error(existingError)
    return jsonResponse({ error: 'Erreur serveur.' }, 500)
  }
  if (!existing) return jsonResponse({ provider, deleted: false })

  // Deleting the vault secret cascades to delete the ai_provider_keys row
  // (FK on delete cascade) — no separate row delete needed.
  const { error: deleteError } = await admin.rpc('ai_vault_delete_secret', {
    p_id: existing.vault_secret_id,
  })
  if (deleteError) {
    console.error(deleteError)
    return jsonResponse({ error: 'Erreur serveur.' }, 500)
  }

  return jsonResponse({ provider, deleted: true })
})
