import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'

export function HomePage() {
  const session = useAuthStore((state) => state.session)

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-4 text-foreground">
      <h1 className="text-2xl font-semibold">Fitness</h1>
      <p className="text-muted-foreground">Connecté en tant que {session?.user.email}</p>
      <Button variant="outline" onClick={() => void supabase.auth.signOut()}>
        Se déconnecter
      </Button>
    </main>
  )
}
