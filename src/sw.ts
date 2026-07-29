/// <reference lib="webworker" />
import { matchPrecache, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

// Derived from the SW's own registration scope rather than hardcoded as
// "/" — this worker is served from the domain root in dev but from
// "/fitness-app/" on GitHub Pages (a project page), and every path below
// needs to resolve correctly under either.
const scopePath = new URL(self.registration.scope).pathname

// precacheAndRoute only serves exact cached URLs — a client-side route like
// /bien-etre has no cache entry of its own, so a hard offline reload on any
// route but the app root would otherwise fail outright. This is the
// standard SPA fallback: every navigation request gets the cached app
// shell, and React Router takes it from there. generateSW injects this
// automatically; the custom injectManifest worker (needed for push
// notifications) does not. Implemented by hand rather than via
// workbox-routing's NavigationRoute — that package's prebundled ESM fails
// to evaluate under vite-plugin-pwa's dev-mode SW harness (works fine in
// the production build, but breaks `pnpm dev` outright), and this is only
// a few lines regardless.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    matchPrecache(`${scopePath}index.html`).then((cached) => cached ?? fetch(event.request)),
  )
})

// registerType: 'prompt' means a newly-installed worker sits in "waiting"
// until told otherwise — virtual:pwa-register/react's updateServiceWorker()
// (wired to the UpdatePrompt banner's "Mettre à jour" button) sends this
// exact message (workbox-window's messageSkipWaiting convention) once the
// user taps it.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | undefined)?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

// Without this, a freshly-activated worker only controls the *next*
// navigation — clients.claim() hands it control of the already-open page
// immediately, so the reload that follows skipWaiting() serves the new
// assets instead of the ones the old worker was still serving.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

interface PushPayload {
  title: string
  body: string
  url?: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = { title: 'My Gym Bro', body: '' }
  try {
    if (event.data) payload = event.data.json() as PushPayload
  } catch {
    // Malformed or missing payload — show a generic notification rather
    // than silently dropping it.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: `${scopePath}pwa-192x192.png`,
      badge: `${scopePath}pwa-192x192.png`,
      data: { url: payload.url ?? '/bien-etre' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // payload.url comes from the server (send-wellness-reminders) as a
  // root-relative app path, e.g. "/bien-etre" — it doesn't know which base
  // path this deployment is served from, so that's resolved here instead.
  const relativePath = (
    (event.notification.data as { url?: string } | undefined)?.url ?? '/bien-etre'
  ).replace(/^\//, '')
  const url = `${scopePath}${relativePath}`
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
