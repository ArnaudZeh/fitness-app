import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRestTimerSoundEnabled } from '@/hooks/useRestTimerSound'
import { usePushSubscription } from '@/hooks/useNotifications'
import { formatTime, playBeep, vibrate } from '@/lib/timer-feedback'
import { cancelRestTimerPush, scheduleRestTimerPush } from '@/lib/rest-timer-push-api'

interface RestTimerProps {
  setId: string
  initialSeconds: number
  onDismiss: () => void
}

function secondsUntil(endAt: number): number {
  return Math.max(Math.round((endAt - Date.now()) / 1000), 0)
}

export function RestTimer({ setId, initialSeconds, onDismiss }: RestTimerProps) {
  // Anchored on a real timestamp rather than decremented tick by tick: the
  // browser throttles/suspends setInterval while the screen is locked, so a
  // pure tick counter falls behind. Recomputing from endAt on every tick and
  // on visibility/focus changes keeps the display correct regardless of how
  // many ticks were actually missed while backgrounded. `endAt` lives in
  // state (not a ref) so effects can react to it changing via `adjust`.
  const [endAt, setEndAt] = useState(() => Date.now() + initialSeconds * 1000)
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const hasRungRef = useRef(false)
  const [soundEnabled, setSoundEnabled] = useRestTimerSoundEnabled()
  const { isSubscribed } = usePushSubscription()

  // Server-side fallback for the case the local alert can't cover: while
  // the screen is locked, the interval below is throttled and the sound/
  // vibration never fires. This schedules a push for endAt, re-scheduled
  // whenever endAt moves (adjust) and cancelled when the local alert
  // actually rings or the timer is dismissed/unmounted.
  useEffect(() => {
    if (isSubscribed) void scheduleRestTimerPush(setId, new Date(endAt))
    return () => void cancelRestTimerPush(setId)
  }, [setId, isSubscribed, endAt])

  useEffect(() => {
    function resync() {
      setSecondsLeft(secondsUntil(endAt))
    }
    resync()
    document.addEventListener('visibilitychange', resync)
    window.addEventListener('focus', resync)
    const interval = setInterval(resync, 1000)
    return () => {
      document.removeEventListener('visibilitychange', resync)
      window.removeEventListener('focus', resync)
      clearInterval(interval)
    }
  }, [endAt])

  useEffect(() => {
    if (secondsLeft > 0 || hasRungRef.current) return
    hasRungRef.current = true
    if (soundEnabled) {
      vibrate([300, 100, 300])
      playBeep()
    }
    // The local alert just rang in the foreground — the server push for
    // this same deadline would now be redundant.
    void cancelRestTimerPush(setId)
  }, [secondsLeft, soundEnabled, setId])

  function adjust(deltaSeconds: number) {
    setEndAt((current) => Math.max(current + deltaSeconds * 1000, Date.now()))
    hasRungRef.current = false
  }

  function handleDismiss() {
    void cancelRestTimerPush(setId)
    onDismiss()
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
        <Button type="button" size="lg" className="h-12!" onClick={handleDismiss}>
          <X /> Passer
        </Button>
      </div>
    </div>
  )
}
