import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

// Invoked every 15s by pg_cron (via pg_net), never by end users — same
// shared-secret auth as send-wellness-reminders, decoupled from Supabase's
// own API keys.
function isAuthorizedCronCaller(req: Request, cronSecret: string): boolean {
  return req.headers.get('x-cron-secret') === cronSecret
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const cronSecret = Deno.env.get('CRON_SECRET')!
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')!

  if (!isAuthorizedCronCaller(req, cronSecret)) {
    return new Response(JSON.stringify({ error: 'Non autorisé.' }), { status: 401 })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const now = new Date()
  // A run more than 2 minutes overdue means a cron gap (outage, deploy) —
  // claim it so it's never retried, but skip the push: a "repos terminé"
  // notification arriving minutes late would confuse more than it helps.
  const staleBefore = new Date(now.getTime() - 2 * 60_000)

  const { data: due, error: dueError } = await admin
    .from('rest_timer_notifications')
    .select('id, user_id, fire_at')
    .eq('sent', false)
    .lte('fire_at', now.toISOString())
  if (dueError) {
    console.error(dueError)
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), { status: 500 })
  }

  let sent = 0
  let stale = 0

  for (const notification of due) {
    // Idempotency / race guard: only the invocation that flips
    // sent false -> true actually sends, in case two cron runs overlap.
    const { data: claimed, error: claimError } = await admin
      .from('rest_timer_notifications')
      .update({ sent: true })
      .eq('id', notification.id)
      .eq('sent', false)
      .select('id')
      .maybeSingle()
    if (claimError || !claimed) continue

    if (new Date(notification.fire_at) < staleBefore) {
      stale += 1
      continue
    }

    const { data: subscriptions, error: subscriptionsError } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', notification.user_id)
    if (subscriptionsError) {
      console.error(subscriptionsError)
      continue
    }

    const payload = JSON.stringify({
      title: 'Repos terminé',
      body: 'Prêt pour la série suivante 💪',
      url: '/',
    })

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
          // Subscription no longer valid — self-heal rather than retry forever.
          await admin.from('push_subscriptions').delete().eq('id', subscription.id)
        } else {
          console.error('Push send failed', notification.id, error)
        }
      }
    }
  }

  return new Response(JSON.stringify({ sent, stale }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
