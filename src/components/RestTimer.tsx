import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRestTimerSoundEnabled } from '@/hooks/useRestTimerSound'
import { formatTime, playBeep, vibrate } from '@/lib/timer-feedback'

interface RestTimerProps {
  initialSeconds: number
  onDismiss: () => void
}

export function RestTimer({ initialSeconds, onDismiss }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const hasRungRef = useRef(false)
  const [soundEnabled, setSoundEnabled] = useRestTimerSoundEnabled()

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!hasRungRef.current) {
        if (soundEnabled) {
          vibrate([300, 100, 300])
          playBeep()
        }
        hasRungRef.current = true
      }
      return
    }
    const timeout = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timeout)
  }, [secondsLeft, soundEnabled])

  function adjust(deltaSeconds: number) {
    setSecondsLeft((seconds) => Math.max(seconds + deltaSeconds, 0))
    hasRungRef.current = false
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-4">
      <div className="flex w-full items-center justify-center gap-1.5">
        <p className="text-sm text-muted-foreground">Repos</p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6"
          aria-label={soundEnabled ? "Désactiver l'alarme de repos" : "Activer l'alarme de repos"}
          onClick={() => setSoundEnabled(!soundEnabled)}
        >
          {soundEnabled ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
        </Button>
      </div>
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
