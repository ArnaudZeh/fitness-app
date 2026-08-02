import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNotificationSupport, usePushSubscription } from '@/hooks/useNotifications'
import { useNotificationsPromptSeen } from '@/hooks/useNotificationsPromptSeen'
import { VAPID_PUBLIC_KEY } from '@/lib/push-api'

// Mounted once, inside AppLayout, so it's reachable for every authenticated
// user — new signups and existing accounts alike — the first time they land
// in the app on a given device. Closing it in any way (Activer, Plus tard,
// Escape, backdrop click) marks it seen for good: this is a one-time nudge,
// not a recurring reminder — the WellnessPage settings toggle stays the
// place to opt in/out afterwards.
export function NotificationsPromptDialog() {
  const support = useNotificationSupport()
  const { isSubscribed, isPending, subscribe } = usePushSubscription()
  const [seen, markSeen] = useNotificationsPromptSeen()

  // isSubscribed stays null until the initial async check resolves — wait
  // for that so an already-subscribed user never sees this flash on screen.
  const shouldOffer =
    !seen &&
    support !== 'unsupported' &&
    (support === 'ios-not-installed' || isSubscribed === false)

  if (!shouldOffer) return null

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && markSeen()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-5" /> Active les notifications
          </DialogTitle>
          <DialogDescription>
            {support === 'ios-not-installed'
              ? "Sur iPhone/iPad, ajoutez d'abord cette app à l'écran d'accueil (Partager → « Sur l'écran d'accueil ») pour pouvoir activer les notifications."
              : 'Sois alerté même écran verrouillé : fin de repos entre les séries, rappels bien-être programmés, activité sur le feed.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {support === 'ios-not-installed' ? (
            <Button onClick={markSeen}>Compris</Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={markSeen}>
                Plus tard
              </Button>
              <Button
                type="button"
                disabled={isPending || !VAPID_PUBLIC_KEY}
                onClick={() => {
                  if (VAPID_PUBLIC_KEY) void subscribe(VAPID_PUBLIC_KEY).finally(markSeen)
                }}
              >
                {isPending ? 'Activation…' : 'Activer'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
