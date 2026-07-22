import { useEffect, useRef, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

function playBeep() {
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
    // Audio isn't essential to the rest timer (vibration + visible countdown
    // still work) — never let a browser audio-policy quirk break logging a set.
  }
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

interface RestTimerProps {
  initialSeconds: number
  onDismiss: () => void
}

export function RestTimer({ initialSeconds, onDismiss }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const hasRungRef = useRef(false)

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!hasRungRef.current) {
        // Vibration API has no iOS Safari support — this is a no-op there,
        // the beep still fires as the audible fallback.
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([300, 100, 300])
        }
        playBeep()
        hasRungRef.current = true
      }
      return
    }
    const timeout = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timeout)
  }, [secondsLeft])

  function adjust(deltaSeconds: number) {
    setSecondsLeft((seconds) => Math.max(seconds + deltaSeconds, 0))
    hasRungRef.current = false
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-4">
      <p className="text-sm text-muted-foreground">Repos</p>
      <p className="font-mono text-5xl font-semibold tabular-nums">
        {formatTime(Math.max(secondsLeft, 0))}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12!"
          onClick={() => adjust(-15)}
        >
          <Minus /> 15s
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12!"
          onClick={() => adjust(15)}
        >
          <Plus /> 15s
        </Button>
        <Button type="button" size="lg" className="h-12!" onClick={onDismiss}>
          <X /> Passer
        </Button>
      </div>
    </div>
  )
}
