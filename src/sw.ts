/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

interface PushPayload {
  title: string
  body: string
  url?: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = { title: 'Fitness', body: '' }
  try {
    if (event.data) payload = event.data.json() as PushPayload
  } catch {
    // Malformed or missing payload — show a generic notification rather
    // than silently dropping it.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: payload.url ?? '/bien-etre' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/bien-etre'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          void client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
