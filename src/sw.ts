/// <reference lib="webworker" />
import { matchPrecache, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

// precacheAndRoute only serves exact cached URLs — a client-side route like
// /bien-etre has no cache entry of its own, so a hard offline reload on any
// route but "/" would otherwise fail outright. This is the standard SPA
// fallback: every navigation request gets the cached app shell, and React
// Router takes it from there. generateSW injects this automatically; the
// custom injectManifest worker (needed for push notifications) does not.
// Implemented by hand rather than via workbox-routing's NavigationRoute —
// that package's prebundled ESM fails to evaluate under vite-plugin-pwa's
// dev-mode SW harness (works fine in the production build, but breaks
// `pnpm dev` outright), and this is only a few lines regardless.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    matchPrecache('/index.html').then((cached) => cached ?? fetch(event.request)),
  )
})

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
