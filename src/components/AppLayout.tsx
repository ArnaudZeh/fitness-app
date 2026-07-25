import { Suspense, useEffect } from 'react'
import { Link, Outlet } from 'react-router'
import { Bot, Dumbbell, Home, Sparkles, Trophy, UserRound } from 'lucide-react'
import { NavBar, type NavItem } from '@/components/ui/tubelight-navbar'
import { useAuthStore } from '@/lib/auth-store'
import { useFriendsData } from '@/hooks/useFriends'
import { useUnreadMentionsCount } from '@/hooks/useMentions'
import { syncTimezone } from '@/lib/profile-api'

export function AppLayout() {
  const session = useAuthStore((state) => state.session)
  const userId = session?.user.id
  // Both are only reachable from inside the Feed page (no dedicated nav tab
  // for either), so a corner badge on the Feed icon is the only way either
  // is ever noticed without opening it first. Friend requests only clear on
  // accept/decline; mentions clear just by viewing the Feed — see FeedPage.
  const { data: friends } = useFriendsData()
  const { data: unreadMentionsCount } = useUnreadMentionsCount()
  const feedBadgeCount = (friends?.incomingRequests.length ?? 0) + (unreadMentionsCount ?? 0)

  const navItems: NavItem[] = [
    { name: 'Accueil', url: '/', icon: Home },
    { name: 'Programmes', url: '/programs', icon: Dumbbell },
    { name: 'Coach', url: '/coach', icon: Bot },
    { name: 'Feed', url: '/feed', icon: Trophy, badgeCount: feedBadgeCount },
    { name: 'Bien-être', url: '/bien-etre', icon: Sparkles },
    { name: 'Profil', url: '/profile', icon: UserRound },
  ]

  // Best-effort — a failed sync just means the wellness reminder scheduler
  // uses a stale timezone until the next successful visit, not a broken UI.
  useEffect(() => {
    if (userId) void syncTimezone().catch(() => {})
  }, [userId])

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4 py-3">
        <Link to="/" className="font-heading text-lg font-semibold">
          Fitness
        </Link>
        <div className="hidden sm:block">
          <NavBar items={navItems} />
        </div>
        <span className="hidden justify-self-end text-sm text-muted-foreground sm:inline">
          {session?.user.email}
        </span>
      </header>

      <main className="mx-auto min-h-0 w-full max-w-2xl flex-1 overflow-y-auto p-4">
        <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
          <Outlet />
        </Suspense>
      </main>

      {/* Sibling of main (not position:fixed) so it sits exactly at the
          shell's bottom edge by construction — a fixed-position nav here
          used to leave a dead scroll gap on mobile once the browser's
          address bar hides/shows, since fixed elements and the svh unit
          don't always agree on where "bottom" is. */}
      <div className="shrink-0 px-2 pb-2 sm:hidden">
        <NavBar items={navItems} />
      </div>
    </div>
  )
}
