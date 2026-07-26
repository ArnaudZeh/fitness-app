import { useState } from 'react'

// Device-local preference (not synced through the account/profiles table)
// — muting the workout alarm is the kind of thing tied to "this phone, in
// this gym," not something you'd expect to follow you to another device.
const STORAGE_KEY = 'rest-timer-sound-enabled'

function readStoredValue(): boolean {
  if (typeof localStorage === 'undefined') return true
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === null ? true : stored === 'true'
}

export function useRestTimerSoundEnabled(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabledState] = useState(readStoredValue)

  function setEnabled(value: boolean) {
    setEnabledState(value)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(value))
    }
  }

  return [enabled, setEnabled]
}
