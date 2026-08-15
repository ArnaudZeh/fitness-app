import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { motion } from 'framer-motion'
import { Bot, Dumbbell, Home, Trophy, Utensils } from 'lucide-react'
import { NavBar, type NavItem } from '@/components/ui/tubelight-navbar'
import { NotificationsPromptDialog } from '@/components/NotificationsPromptDialog'
import { useAuthStore } from '@/lib/auth-store'
import { useFriendsData } from '@/hooks/useFriends'
import { useUnreadMentionsCount } from '@/hooks/useMentions'
import { useUnreadActivityNotificationsCount } from '@/hooks/useActivityNotifications'
import { syncTimezone } from '@/lib/profile-api'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const session = useAuthStore((state) => state.session)
  const userId = session?.user.id
  // No scroll on the dashboard, on any device — step 1 of resizing that
  // page's layout to actually fit without one (HomePage.tsx sizing comes
  // next). Every other route keeps normal scrolling.
  const isDashboard = useLocation().pathname === '/'
  // All three are only reachable from inside the Feed page (no dedicated
  // nav tab for any), so a corner badge on the Feed icon is the only way
  // any of them is ever noticed without opening it first. Friend requests
  // only clear on accept/decline; mentions and activity (likes/comments on
  // your content) clear just by viewing the Feed — see FeedPage.
  const { data: friends } = useFriendsData()
  const { data: unreadMentionsCount } = useUnreadMentionsCount()
  const { data: unreadActivityCount } = useUnreadActivityNotificationsCount()
  const feedBadgeCount =
    (friends?.incomingRequests.length ?? 0) +
    (unreadMentionsCount ?? 0) +
    (unreadActivityCount ?? 0)

  const navItems: NavItem[] = [
    { name: 'Accueil', url: '/', icon: Home },
    { name: 'Programmes', url: '/programs', icon: Dumbbell },
    { name: 'Nutrition', url: '/nutrition', icon: Utensils },
    { name: 'Coach', url: '/coach', icon: Bot },
    { name: 'Feed', url: '/feed', icon: Trophy, badgeCount: feedBadgeCount },
  ]

  // Best-effort — a failed sync just means the wellness reminder scheduler
  // uses a stale timezone until the next successful visit, not a broken UI.
  useEffect(() => {
    if (userId) void syncTimezone().catch(() => {})
  }, [userId])

  // Facebook-style bottom nav: slides out on scroll-down, back in on
  // scroll-up, and always shown near the top or while idle. Listens on
  // <main> itself (not window) since it's the only scrolling element —
  // the shell around it is locked to the viewport height.
  const mainRef = useRef<HTMLElement>(null)
  const [isNavVisible, setIsNavVisible] = useState(true)

  useEffect(() => {
    const el = mainRef.current
    if (!el) return

    let lastScrollTop = el.scrollTop

    const handleScroll = () => {
      const { scrollTop } = el
      const delta = scrollTop - lastScrollTop

      if (scrollTop < 32) {
        setIsNavVisible(true)
      } else if (delta > 8) {
        setIsNavVisible(false)
      } else if (delta < -8) {
        setIsNavVisible(true)
      }
      lastScrollTop = scrollTop
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <NotificationsPromptDialog />
      <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4 py-3">
        <Link to="/" className="font-heading text-lg font-semibold">
          My Gym Bro
        </Link>
        <div className="hidden sm:block">
          <NavBar items={navItems} />
        </div>
        <span className="hidden justify-self-end text-sm text-muted-foreground sm:inline">
          {session?.user.email}
        </span>
      </header>

      <main
        ref={mainRef}
        className={cn(
          // relative: without it, `<main>` is position:static, so an
          // absolutely-positioned descendant with no other positioned
          // ancestor (e.g. Radix Select's hidden native <select>, used for
          // form/autofill sync) establishes its containing block all the
          // way up at <html> instead of here. On a long page with several
          // Select fields (the coaching profile form), that inflates
          // document.documentElement.scrollHeight past the real viewport
          // even though <main> itself clips correctly — which lets iOS
          // Safari rubber-band-scroll the whole page into blank space
          // below the real content. Confirmed by toggling this on/off:
          // scrollHeight drops from 1576 to the correct 844 the instant
          // <main> becomes a containing block.
          'relative mx-auto min-h-0 w-full max-w-2xl flex-1 p-4 pb-24 sm:pb-4',
          isDashboard ? 'overflow-hidden' : 'overflow-y-auto',
        )}
      >
        <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
          <Outlet />
        </Suspense>
      </main>

      {/* position:fixed (not a flow sibling) so it stays glued to the
          visual viewport bottom on iOS Safari/home-screen PWAs regardless
          of toolbar show/hide — required for the slide-out-on-scroll
          animation anyway, since a flow element can't animate out without
          reflowing <main> underneath it. <main>'s pb-24 reserves the space
          this used to claim by sitting in flow. */}
      <motion.div
        className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[calc(0.5rem+25px+env(safe-area-inset-bottom))] sm:hidden"
        animate={{ y: isNavVisible ? '0%' : '150%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      >
        <NavBar items={navItems} />
      </motion.div>
    </div>
  )
}
