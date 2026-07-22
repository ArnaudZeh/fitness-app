import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export interface AuthedContext {
  userId: string
  admin: SupabaseClient
}

// Verifies the caller's JWT against the anon-key client, then returns a
// separate service_role client for the privileged writes (Vault + table).
// The user id always comes from the verified JWT, never from the request
// body — a caller cannot act on another user's keys by editing the payload.
export async function requireAuthedContext(
  req: Request,
): Promise<AuthedContext | Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Non authentifié.' }, 401)

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) return jsonResponse({ error: 'Non authentifié.' }, 401)

  return { userId: user.id, admin: createClient(supabaseUrl, serviceRoleKey) }
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response
}
