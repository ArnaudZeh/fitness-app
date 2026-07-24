import { Suspense, useEffect } from 'react'
import { Link, Outlet } from 'react-router'
import { Bot, Dumbbell, Home, Sparkles, Trophy, UserRound } from 'lucide-react'
import { NavBar, type NavItem } from '@/components/ui/tubelight-navbar'
import { useAuthStore } from '@/lib/auth-store'
import { syncTimezone } from '@/lib/profile-api'

const NAV_ITEMS: NavItem[] = [
  { name: 'Accueil', url: '/', icon: Home },
  { name: 'Programmes', url: '/programs', icon: Dumbbell },
  { name: 'Coach', url: '/coach', icon: Bot },
  { name: 'Feed', url: '/feed', icon: Trophy },
  { name: 'Bien-être', url: '/bien-etre', icon: Sparkles },
  { name: 'Profil', url: '/profile', icon: UserRound },
]

export function AppLayout() {
  const session = useAuthStore((state) => state.session)
  const userId = session?.user.id

  // Best-effort — a failed sync just means the wellness reminder scheduler
  // uses a stale timezone until the next successful visit, not a broken UI.
  useEffect(() => {
    if (userId) void syncTimezone().catch(() => {})
  }, [userId])

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4 py-3">
        <Link to="/" className="font-heading text-lg font-semibold">
          Fitness
        </Link>
        <div className="hidden sm:block">
          <NavBar items={NAV_ITEMS} />
        </div>
        <span className="hidden justify-self-end text-sm text-muted-foreground sm:inline">
          {session?.user.email}
        </span>
      </header>

      <div className="fixed inset-x-0 bottom-0 z-50 px-2 pb-2 sm:hidden">
        <NavBar items={NAV_ITEMS} />
      </div>

      <main className="mx-auto max-w-2xl p-4 pb-24 sm:pb-4">
        <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
