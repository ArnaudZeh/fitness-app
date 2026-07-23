import { Suspense, useEffect } from 'react'
import { Link, Outlet } from 'react-router'
import { ChartLine, Moon, Sparkles, Trophy, UserRound, Wind } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
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

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link to="/" className="font-heading text-lg font-semibold">
          Fitness
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {session?.user.email}
          </span>
          <Link to="/feed">
            <Button variant="outline" size="icon-sm" aria-label="Feed">
              <Trophy />
            </Button>
          </Link>
          <Link to="/analytics">
            <Button variant="outline" size="icon-sm" aria-label="Analytics">
              <ChartLine />
            </Button>
          </Link>
          <Link to="/bien-etre">
            <Button variant="outline" size="icon-sm" aria-label="Bien-être">
              <Sparkles />
            </Button>
          </Link>
          <Link to="/apnee">
            <Button variant="outline" size="icon-sm" aria-label="Hypoxie intermittente">
              <Wind />
            </Button>
          </Link>
          {profile?.cycle_module_enabled && (
            <Link to="/cycle">
              <Button variant="outline" size="icon-sm" aria-label="Cycle">
                <Moon />
              </Button>
            </Link>
          )}
          <Link to="/profile">
            <Button variant="outline" size="icon-sm" aria-label="Mon profil">
              <UserRound />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void supabase.auth.signOut()}
          >
            Se déconnecter
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl p-4">
        <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
