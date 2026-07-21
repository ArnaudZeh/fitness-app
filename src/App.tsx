import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

type SupabaseStatus = 'checking' | 'connected' | 'error'

function App() {
  const [status, setStatus] = useState<SupabaseStatus>('checking')

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(() => setStatus('connected'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-2xl font-semibold">Fitness — P0 squelette</h1>
      <p className="text-muted-foreground">
        Statut Supabase :{' '}
        <span
          data-testid="supabase-status"
          className={
            status === 'connected'
              ? 'text-green-600'
              : status === 'error'
                ? 'text-destructive'
                : 'text-muted-foreground'
          }
        >
          {status}
        </span>
      </p>
      <Button>shadcn/ui fonctionne</Button>
    </main>
  )
}

export default App
