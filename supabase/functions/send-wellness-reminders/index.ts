import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

// Invoked every minute by pg_cron (via pg_net), never by end users — there
// is no per-user JWT to verify here. Authorization is a dedicated random
// secret (CRON_SECRET) that pg_cron reads from Vault at invocation time and
// sends as a custom header — decoupled from Supabase's own API keys
// entirely, rather than comparing against SUPABASE_SERVICE_ROLE_KEY (which
// didn't match what `supabase projects api-keys` returns, likely a
// legacy-vs-current key format difference).
function isAuthorizedCronCaller(req: Request, cronSecret: string): boolean {
  return req.headers.get('x-cron-secret') === cronSecret
}

interface LocalDateTimeParts {
  isoWeekday: number
  hhmm: string
  dateStr: string
}

const ISO_WEEKDAY_BY_SHORT_NAME: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
}

// reminder_time is a wall-clock time the user entered in their own browser
// — comparing it to server UTC directly would fire reminders at the wrong
// hour (and sometimes the wrong day). profiles.timezone (IANA) lets us
// compute what the wall-clock time actually is for that user right now.
function getLocalDateTimeParts(date: Date, timeZone: string): LocalDateTimeParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return {
    isoWeekday: ISO_WEEKDAY_BY_SHORT_NAME[byType.weekday] ?? 0,
    hhmm: `${byType.hour}:${byType.minute}`,
    dateStr: `${byType.year}-${byType.month}-${byType.day}`,
  }
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

  const { data: activities, error: activitiesError } = await admin
    .from('wellness_activities')
    .select('id, user_id, name, days_of_week, reminder_time')
    .eq('active', true)
    .not('reminder_time', 'is', null)
  if (activitiesError) {
    console.error(activitiesError)
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), { status: 500 })
  }

  // wellness_activities.user_id and profiles.id both reference auth.users
  // independently — no direct FK between the two tables for PostgREST to
  // embed, so the join happens here instead of via a nested select.
  const userIds = [...new Set(activities.map((a) => a.user_id))]
  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, timezone')
    .in('id', userIds)
  if (profilesError) {
    console.error(profilesError)
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), { status: 500 })
  }
  const timezoneByUserId = new Map(profiles.map((p) => [p.id, p.timezone]))

  const now = new Date()
  let sent = 0
  let skipped = 0

  for (const activity of activities) {
    const timezone = timezoneByUserId.get(activity.user_id)
    if (!timezone) continue

    const local = getLocalDateTimeParts(now, timezone)
    if (!activity.days_of_week.includes(local.isoWeekday)) continue
    if (activity.reminder_time?.slice(0, 5) !== local.hhmm) continue

    // Idempotency: this insert is the dedup gate. A unique violation means
    // another invocation (an overlapping cron run) already claimed this
    // activity for today — skip sending, don't double-notify.
    const { error: sendLogError } = await admin
      .from('wellness_reminder_sends')
      .insert({ activity_id: activity.id, sent_date: local.dateStr })
    if (sendLogError) {
      skipped += 1
      continue
    }

    const { data: subscriptions, error: subscriptionsError } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', activity.user_id)
    if (subscriptionsError) {
      console.error(subscriptionsError)
      continue
    }

    const payload = JSON.stringify({
      title: 'Bien-être',
      body: activity.name,
      url: '/bien-etre',
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
          // Subscription no longer valid (browser data cleared, uninstalled,
          // permission revoked) — self-heal rather than retry forever.
          await admin.from('push_subscriptions').delete().eq('id', subscription.id)
        } else {
          console.error('Push send failed', activity.id, error)
        }
      }
    }
  }

  return new Response(JSON.stringify({ sent, skipped }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
