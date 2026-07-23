import { corsHeaders } from '../_shared/cors.ts'
import { isResponse, jsonResponse, requireAuthedContext } from '../_shared/http.ts'
import { adaptSession, type CurrentExercise } from '../_shared/ai-session-adaptation.ts'

// On-demand only, triggered from the "Adapter avec l'IA" dialog on a
// session template card — never on a schedule. BYOK means the user's own
// provider account pays for each call.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const ctx = await requireAuthedContext(req)
  if (isResponse(ctx)) return ctx
  const { userId, admin } = ctx

  let body: {
    provider?: string
    profileContext?: unknown
    trendSummary?: unknown
    currentExercises?: CurrentExercise[]
    availableExercises?: { id: string; name: string; muscleGroup: string | null }[]
    dayContext?: string
  }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corps de requête invalide.' }, 400)
  }
  const provider = body.provider
  if (provider !== 'anthropic' && provider !== 'openai') {
    return jsonResponse({ error: 'Provider invalide.' }, 400)
  }
  if (!body.profileContext) {
    return jsonResponse({ error: 'Contexte de profil manquant.' }, 400)
  }
  if (!body.trendSummary) {
    return jsonResponse({ error: 'Résumé de tendance manquant.' }, 400)
  }
  if (!Array.isArray(body.currentExercises) || body.currentExercises.length === 0) {
    return jsonResponse({ error: 'Séance actuelle manquante ou vide.' }, 400)
  }
  if (!Array.isArray(body.availableExercises) || body.availableExercises.length === 0) {
    return jsonResponse({ error: 'Aucun exercice disponible pour l\'adaptation.' }, 400)
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
    const proposal = await adaptSession(provider, secretValue, {
      profileContext: body.profileContext,
      trendSummary: body.trendSummary,
      currentExercises: body.currentExercises,
      availableExercises: body.availableExercises,
      dayContext: body.dayContext ?? '',
    })
    return jsonResponse({ proposal })
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : 'Erreur inconnue.'
    return jsonResponse({ error: message }, 502)
  }
})
