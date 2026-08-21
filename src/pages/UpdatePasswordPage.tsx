import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

type LinkStatus = 'checking' | 'ready' | 'invalid'

// How long to wait for the recovery link's code-exchange (handled
// automatically by the client on load, detectSessionInUrl defaults to true)
// before concluding the link is missing/expired rather than just slow.
const LINK_CHECK_TIMEOUT_MS = 4000

// Deliberately not gated behind ProtectedRoute/useAuthStore's usual
// "authenticated -> redirect to /" check (unlike LoginPage/SignupPage) —
// the recovery link itself establishes a session, which would otherwise
// bounce the user to "/" before they ever get to set a new password.
export function UpdatePasswordPage() {
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let settled = false
    const markReady = () => {
      if (!settled) {
        settled = true
        setLinkStatus('ready')
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') markReady()
    })
    // Covers a session already established by the time this page mounts —
    // onAuthStateChange only fires on the transition, not for a session
    // that finished exchanging just before the listener was attached.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady()
    })
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true
        setLinkStatus('invalid')
      }
    }, LINK_CHECK_TIMEOUT_MS)

    return () => {
      subscription.unsubscribe()
      window.clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setIsSubmitting(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle as="h1" className="text-2xl">
              Mot de passe mis à jour
            </CardTitle>
            <CardDescription>Tu peux continuer avec ton nouveau mot de passe.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button className="w-full">Continuer</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (linkStatus === 'invalid') {
    return (
      <main className="flex min-h-full flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle as="h1" className="text-2xl">
              Lien invalide ou expiré
            </CardTitle>
            <CardDescription>
              Ce lien de réinitialisation n'est plus valable. Demandes-en un nouveau.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/forgot-password">
              <Button variant="outline" className="w-full">
                Redemander un lien
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle as="h1" className="text-2xl">
            Nouveau mot de passe
          </CardTitle>
          <CardDescription>Choisis un nouveau mot de passe pour ton compte.</CardDescription>
        </CardHeader>
        <CardContent>
          {linkStatus === 'checking' ? (
            <p className="text-sm text-muted-foreground">Vérification du lien…</p>
          ) : (
            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={isSubmitting} className="mt-2">
                {isSubmitting ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
