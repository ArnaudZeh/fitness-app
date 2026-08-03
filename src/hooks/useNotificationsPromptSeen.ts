import { useState } from 'react'

// Device-local — the point is to ask once per install/browser, not once
// per account (a second device, or a reinstalled PWA, has its own
// permission state to ask about).
//
// Keyed to the deployed app version (git SHA, see vite.config.ts) rather
// than a plain "seen" boolean: someone who dismisses without subscribing
// sees the prompt again on the next deploy, not never again for the life
// of the device. Comparing against __APP_VERSION__ re-arms it naturally
// each time that changes, with no extra bookkeeping — the profile page's
// notifications toggle is the way to opt in/out without waiting for it.
const STORAGE_KEY = 'notifications-prompt-dismissed-version'

function readStoredVersion(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

export function useNotificationsPromptSeen(): [boolean, () => void] {
  const [dismissedVersion, setDismissedVersion] = useState(readStoredVersion)
  const seen = dismissedVersion === __APP_VERSION__

  function markSeen() {
    setDismissedVersion(__APP_VERSION__)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, __APP_VERSION__)
    }
  }

  return [seen, markSeen]
}
