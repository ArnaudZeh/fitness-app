import { Suspense, useEffect } from 'react'
import { Link, Outlet } from 'react-router'
import { Bot, ChartLine, Moon, Sparkles, Trophy, UserRound, Wind } from 'lucide-react'
import { NavBar, type NavItem } from '@/components/ui/tubelight-navbar'
import { useAuthStore } from '@/lib/auth-store'
import { syncTimezone } from '@/lib/profile-api'
import { useProfile } from '@/hooks/useProfile'

export function AppLayout() {
  const session = useAuthStore((state) => state.session)
  const userId = session?.user.id
  const { data: profile } = useProfile()

  // Best-effort — a failed sync just means the wellness reminder scheduler
  // uses a stale timezone until the next successful visit, not a broken UI.
  useEffect(() => {
    if (userId) void syncTimezone().catch(() => {})
  }, [userId])

  const navItems: NavItem[] = [
    { name: 'Coach', url: '/coach', icon: Bot },
    { name: 'Feed', url: '/feed', icon: Trophy },
    { name: 'Analytics', url: '/analytics', icon: ChartLine },
    { name: 'Bien-être', url: '/bien-etre', icon: Sparkles },
    { name: 'Hypoxie', url: '/apnee', icon: Wind, ariaLabel: 'Hypoxie intermittente' },
    ...(profile?.cycle_module_enabled
      ? [{ name: 'Cycle', url: '/cycle', icon: Moon }]
      : []),
    { name: 'Profil', url: '/profile', icon: UserRound },
  ]

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4 py-3">
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

      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pb-4 sm:hidden">
        <NavBar items={navItems} />
      </div>

      <main className="mx-auto max-w-2xl p-4 pb-28 sm:pb-4">
        <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
