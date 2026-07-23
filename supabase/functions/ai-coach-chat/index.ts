import { corsHeaders } from '../_shared/cors.ts'
import { isResponse, jsonResponse, requireAuthedContext } from '../_shared/http.ts'
import {
  runCoachChat,
  type ConversationMessage,
  type ProgramDaySnapshot,
} from '../_shared/ai-coach-chat.ts'

// On-demand only, triggered by each message sent from /coach — never on a
// schedule. BYOK means the user's own provider account pays for each call,
// and a single message can trigger up to two provider calls internally
// (the chat turn itself, plus one more only when it calls a tool that
// generates/adapts — those two already make their own single call each).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const ctx = await requireAuthedContext(req)
  if (isResponse(ctx)) return ctx
  const { userId, admin } = ctx

  let body: {
    provider?: string
    message?: string
    conversationHistory?: ConversationMessage[]
    profileContext?: unknown
    trendSummary?: unknown
    programStructure?: ProgramDaySnapshot[]
    availableExercises?: { id: string; name: string; muscleGroup: string | null }[]
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
  if (typeof body.message !== 'string' || body.message.trim() === '') {
    return jsonResponse({ error: 'Message manquant.' }, 400)
  }
  if (!body.profileContext) {
    return jsonResponse({ error: 'Contexte de profil manquant.' }, 400)
  }
  if (!body.trendSummary) {
    return jsonResponse({ error: 'Résumé de tendance manquant.' }, 400)
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
    const result = await runCoachChat(provider, secretValue, {
      message: body.message,
      conversationHistory: body.conversationHistory ?? [],
      profileContext: body.profileContext,
      trendSummary: body.trendSummary,
      programStructure: body.programStructure ?? [],
      availableExercises: body.availableExercises ?? [],
    })
    return jsonResponse(result)
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : 'Erreur inconnue.'
    return jsonResponse({ error: message }, 502)
  }
})
