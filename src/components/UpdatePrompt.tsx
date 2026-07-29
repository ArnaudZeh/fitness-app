import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'

// Deploys land on main several times a day, but an iOS home-screen PWA has
// no notion of "check for updates" of its own — the browser only re-checks
// the SW script on its own schedule (up to 24h). Re-checking on every
// visibility change catches the common case (reopening the app from the
// home screen after a deploy) far sooner than waiting on that.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const checkForUpdate = () => void registration.update()
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate()
      })
      setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS)
    },
  })

  if (!needRefresh) return null

  return (
    // Deliberately in normal flow, not `fixed` — App.tsx stacks this above
    // a `flex-1 min-h-0` route container in a shared column, so this takes
    // its own height and pushes AppLayout's header down instead of
    // overlaying it (AppLayout/LoginPage/SignupPage all assume they own
    // whatever height their parent hands them, not the full viewport).
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-primary px-4 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] text-sm text-primary-foreground">
      <span>Nouvelle version disponible</span>
      <Button size="sm" variant="secondary" onClick={() => void updateServiceWorker(true)}>
        Mettre à jour
      </Button>
    </div>
  )
}
