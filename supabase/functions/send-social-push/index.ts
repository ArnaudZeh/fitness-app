import webpush from 'npm:web-push@3'
import { corsHeaders } from '../_shared/cors.ts'
import { isResponse, jsonResponse, requireAuthedContext } from '../_shared/http.ts'

// Client calls this right after inserting a feed_mentions or
// feed_activity_notifications row (both already RLS-validated: actor must
// be able to see the content, and for activity notifications, recipient_id
// must be the content's real owner). This function re-fetches that row
// with the service-role client and checks actor_id/author_id against the
// caller's own verified JWT before sending anything — a caller can only
// ever trigger a push for an event it just legitimately created, never an
// arbitrary push to an arbitrary user.
type Source = 'mention' | 'activity'

interface RequestBody {
  source?: Source
  id?: string
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  post: 'ta publication',
  milestone: 'ton record',
  comment: 'ton commentaire',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const ctx = await requireAuthedContext(req)
  if (isResponse(ctx)) return ctx
  const { userId, admin } = ctx

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')!

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corps de requête invalide.' }, 400)
  }

  if (body.source !== 'mention' && body.source !== 'activity') {
    return jsonResponse({ error: 'source invalide.' }, 400)
  }
  if (!body.id) {
    return jsonResponse({ error: 'id manquant.' }, 400)
  }

  let recipientId: string
  let actorId: string
  let title: string
  let notificationBody: string

  if (body.source === 'mention') {
    const { data: mention, error: mentionError } = await admin
      .from('feed_mentions')
      .select('author_id, mentioned_user_id, content_type')
      .eq('id', body.id)
      .maybeSingle()
    if (mentionError) {
      console.error(mentionError)
      return jsonResponse({ error: 'Erreur serveur.' }, 500)
    }
    if (!mention || mention.author_id !== userId) {
      return jsonResponse({ error: 'Introuvable.' }, 404)
    }
    recipientId = mention.mentioned_user_id
    actorId = mention.author_id
    title = 'My Gym Bro'
    notificationBody =
      mention.content_type === 'comment'
        ? "t'a mentionné dans un commentaire."
        : "t'a mentionné dans un post."
  } else {
    const { data: activity, error: activityError } = await admin
      .from('feed_activity_notifications')
      .select('actor_id, recipient_id, type, content_type')
      .eq('id', body.id)
      .maybeSingle()
    if (activityError) {
      console.error(activityError)
      return jsonResponse({ error: 'Erreur serveur.' }, 500)
    }
    if (!activity || activity.actor_id !== userId) {
      return jsonResponse({ error: 'Introuvable.' }, 404)
    }
    recipientId = activity.recipient_id
    actorId = activity.actor_id
    title = 'My Gym Bro'
    const targetLabel = CONTENT_TYPE_LABEL[activity.content_type] ?? 'ta publication'
    notificationBody =
      activity.type === 'like' ? `a aimé ${targetLabel}.` : `a commenté ${targetLabel}.`
  }

  const { data: actorProfile } = await admin
    .from('public_profiles')
    .select('display_name')
    .eq('id', actorId)
    .maybeSingle()
  const actorName = actorProfile?.display_name ?? 'Quelqu\'un'

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', recipientId)
  if (subscriptionsError) {
    console.error(subscriptionsError)
    return jsonResponse({ error: 'Erreur serveur.' }, 500)
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  const payload = JSON.stringify({
    title,
    body: `${actorName} ${notificationBody}`,
    url: '/feed',
  })

  let sent = 0
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload,
      )
      sent += 1
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', subscription.id)
      } else {
        console.error('Push send failed', body.source, body.id, error)
      }
    }
  }

  return jsonResponse({ sent })
})
