import { useEffect, useState } from 'react'
import * as api from '@/lib/push-api'

export function useNotificationSupport() {
  return api.getNotificationSupport()
}

export function usePushSubscription() {
  const support = api.getNotificationSupport()
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(
    support === 'supported' ? null : false,
  )
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (support !== 'supported') return
    let cancelled = false
    api
      .getExistingPushSubscription()
      .then((subscription) => {
        if (!cancelled) setIsSubscribed(subscription !== null)
      })
      .catch(() => {
        if (!cancelled) setIsSubscribed(false)
      })
    return () => {
      cancelled = true
    }
  }, [support])

  async function subscribe(vapidPublicKey: string) {
    setIsPending(true)
    setError(null)
    try {
      await api.subscribeToPush(vapidPublicKey)
      setIsSubscribed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.')
    } finally {
      setIsPending(false)
    }
  }

  async function unsubscribe() {
    setIsPending(true)
    setError(null)
    try {
      await api.unsubscribeFromPush()
      setIsSubscribed(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.')
    } finally {
      setIsPending(false)
    }
  }

  return { isSubscribed, isPending, error, subscribe, unsubscribe }
}
