// Shared audible/haptic cues for on-screen countdowns (rest timer, breath
// protocol runner) — lifted out once a second timer needed the exact same
// beep/vibrate logic rather than duplicating the AudioContext plumbing.

export function playBeep() {
  if (typeof AudioContext === 'undefined') return
  try {
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.2, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.4)
  } catch {
    // Audio isn't essential — vibration + visible countdown still work,
    // never let a browser audio-policy quirk break a timer.
  }
}

// Vibration API has no iOS Safari support — silent no-op there, the beep
// still fires as the audible fallback.
export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
