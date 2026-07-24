import { corsHeaders } from '../_shared/cors.ts'
import { isResponse, jsonResponse, requireAuthedContext } from '../_shared/http.ts'

// Deletes a user's account and everything owned by it. Every app table's
// user_id FK cascades from auth.users (verified across all migrations), so
// deleting the auth user is normally enough — except:
// - ai_provider_keys: its vault_secret_id FK cascades the OTHER way
//   (deleting the vault secret drops the row, not the reverse), so a plain
//   admin.deleteUser() would leave the user's Anthropic/OpenAI key secrets
//   orphaned in Vault forever.
// - posts: deleting auth.users cascades the DB row (real FK), but the
//   actual image bytes (when a post has a photo) live in Storage, which has
//   no FK relationship to auth.users at all — confirmed by testing, not
//   assumed — so the files would be orphaned in the bucket forever, still
//   counting against quota and still existing despite the user asking for
//   their data deleted.
// Both are cleaned up explicitly before the auth user is deleted.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const ctx = await requireAuthedContext(req)
  if (isResponse(ctx)) return ctx
  const { userId, admin } = ctx

  const { data: keys, error: keysError } = await admin
    .from('ai_provider_keys')
    .select('vault_secret_id')
    .eq('user_id', userId)
  if (keysError) {
    console.error(keysError)
    return jsonResponse({ error: 'Erreur serveur.' }, 500)
  }

  for (const key of keys ?? []) {
    const { error: deleteSecretError } = await admin.rpc('ai_vault_delete_secret', {
      p_id: key.vault_secret_id,
    })
    if (deleteSecretError) {
      console.error(deleteSecretError)
      return jsonResponse({ error: 'Erreur serveur.' }, 500)
    }
  }

  const { data: posts, error: postsError } = await admin
    .from('posts')
    .select('storage_path')
    .eq('user_id', userId)
    .not('storage_path', 'is', null)
  if (postsError) {
    console.error(postsError)
    return jsonResponse({ error: 'Erreur serveur.' }, 500)
  }

  if (posts && posts.length > 0) {
    const { error: removeError } = await admin.storage
      .from('progress-photos')
      .remove(posts.map((p) => p.storage_path as string))
    if (removeError) {
      console.error(removeError)
      return jsonResponse({ error: 'Erreur serveur.' }, 500)
    }
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId)
  if (deleteUserError) {
    console.error(deleteUserError)
    return jsonResponse({ error: 'Erreur serveur.' }, 500)
  }

  return jsonResponse({ deleted: true })
})
