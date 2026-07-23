import { useEffect, useRef, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTime, playBeep, vibrate } from '@/lib/timer-feedback'

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
        vibrate([300, 100, 300])
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
