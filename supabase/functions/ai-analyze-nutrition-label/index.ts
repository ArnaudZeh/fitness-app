import { corsHeaders } from '../_shared/cors.ts'
import { isResponse, jsonResponse, requireAuthedContext } from '../_shared/http.ts'
import { analyzeNutritionLabel } from '../_shared/ai-nutrition-label-vision.ts'

// On-demand only, triggered by the user taking/picking a photo — BYOK means
// the user's own provider account pays for each call, same discipline as
// every other AI edge function in this app.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const ctx = await requireAuthedContext(req)
  if (isResponse(ctx)) return ctx
  const { userId, admin } = ctx

  let body: { provider?: string; imageBase64?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corps de requête invalide.' }, 400)
  }
  const provider = body.provider
  if (provider !== 'anthropic' && provider !== 'openai') {
    return jsonResponse({ error: 'Provider invalide.' }, 400)
  }
  if (!body.imageBase64) {
    return jsonResponse({ error: 'Image manquante.' }, 400)
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
  if (!existing) {
    return jsonResponse({ error: 'Aucune clé enregistrée pour ce provider.' }, 404)
  }

  const { data: secretValue, error: secretError } = await admin.rpc('ai_vault_read_secret', {
    p_id: existing.vault_secret_id,
  })
  if (secretError || typeof secretValue !== 'string') {
    console.error(secretError)
    return jsonResponse({ error: 'Erreur serveur.' }, 500)
  }

  try {
    const extraction = await analyzeNutritionLabel(provider, secretValue, body.imageBase64)
    return jsonResponse({ extraction })
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : 'Erreur inconnue.'
    return jsonResponse({ error: message }, 502)
  }
})
