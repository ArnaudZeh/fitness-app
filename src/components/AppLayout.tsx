import { Link, Outlet } from 'react-router'
import { UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'

export function AppLayout() {
  const session = useAuthStore((state) => state.session)

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
        <Outlet />
      </main>
    </div>
  )
}
