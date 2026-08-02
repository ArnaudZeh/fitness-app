import { useState } from 'react'

// Device-local — the point is to ask once per install/browser, not once
// per account (a second device, or a reinstalled PWA, has its own
// permission state to ask about).
const STORAGE_KEY = 'notifications-prompt-seen'

function readStoredValue(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function useNotificationsPromptSeen(): [boolean, () => void] {
  const [seen, setSeenState] = useState(readStoredValue)

  function markSeen() {
    setSeenState(true)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
  }

  return [seen, markSeen]
}
