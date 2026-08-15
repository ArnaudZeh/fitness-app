import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNotificationSupport, usePushSubscription } from '@/hooks/useNotifications'
import { VAPID_PUBLIC_KEY } from '@/lib/push-api'

// Shared between WellnessPage (where the wellness-reminder framing lives)
// and ProfilePage (a stable, always-findable place to manage the setting
// without waiting for the first-launch prompt) — same subscription, same
// toggle, just surfaced in two contexts.
export function NotificationsCard() {
  const support = useNotificationSupport()
  const { isSubscribed, isPending, error, subscribe, unsubscribe } = usePushSubscription()

  if (support === 'unsupported') return null

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Notifications</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {support === 'ios-not-installed' ? (
          <p className="text-sm text-muted-foreground">
            Sur iPhone/iPad, ajoutez d'abord cette app à l'écran d'accueil (Partager →
            « Sur l'écran d'accueil ») pour pouvoir activer les rappels.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Fin de repos entre les séries, rappels bien-être programmés, activité sur le
              feed : reçus même écran verrouillé.
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="button"
              variant={isSubscribed ? 'outline' : 'default'}
              size="sm"
              className="self-start"
              disabled={isPending || isSubscribed === null || !VAPID_PUBLIC_KEY}
              onClick={() => {
                if (isSubscribed) {
                  void unsubscribe()
                } else if (VAPID_PUBLIC_KEY) {
                  void subscribe(VAPID_PUBLIC_KEY)
                }
              }}
            >
              {isPending
                ? 'Chargement…'
                : isSubscribed
                  ? 'Désactiver les notifications'
                  : 'Activer les notifications'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
