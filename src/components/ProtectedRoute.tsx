import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuthStore } from '@/lib/auth-store'

// This is a UX convenience only, not the security boundary — it just avoids
// flashing protected UI before redirecting. Real access control is enforced
// server-side by Postgres RLS policies (auth.uid() scoping), verified in P1.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
        Chargement…
      </main>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
