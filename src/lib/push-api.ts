import { supabase } from '@/lib/supabase'

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// PushManager.subscribe wants the VAPID public key as a Uint8Array backed by
// a plain ArrayBuffer, not the base64url string it's distributed as.
// Uint8Array.from(...) types as Uint8Array<ArrayBufferLike>, which TS no
// longer accepts where an ArrayBufferView<ArrayBuffer> is expected — `new
// Uint8Array(length)` is backed by a fresh ArrayBuffer instead.
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i)
  }
  return bytes
}

export type NotificationSupport = 'unsupported' | 'ios-not-installed' | 'supported'

// iOS Safari only exposes Web Push to a PWA added to the home screen — in
// an ordinary browser tab, Notification/PushManager are undefined there,
// which is otherwise indistinguishable from "not supported at all".
export function getNotificationSupport(): NotificationSupport {
  if (typeof window === 'undefined') return 'unsupported'
  if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
    return 'supported'
  }
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  if (isIOS && !isStandalone) return 'ios-not-installed'
  return 'unsupported'
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (getNotificationSupport() !== 'supported') return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function subscribeToPush(vapidPublicKey: string): Promise<void> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Permission refusée.')
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })

  const json = subscription.toJSON()
  if (!json.keys?.p256dh || !json.keys.auth) {
    throw new Error('Abonnement push invalide.')
  }

  const userId = await requireUserId()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingPushSubscription()
  if (!subscription) return

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', subscription.endpoint)
  if (error) throw error

  await subscription.unsubscribe()
}
