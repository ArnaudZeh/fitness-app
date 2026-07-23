import { type FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router'
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
import { useAuthStore } from '@/lib/auth-store'

export function SignupPage() {
  const status = useAuthStore((state) => state.status)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: signUpError } = await supabase.auth.signUp({ email, password })

    setIsSubmitting(false)
    if (signUpError) {
      setError(
        signUpError.message === 'User already registered'
          ? 'Un compte existe déjà avec cet email.'
          : signUpError.message,
      )
      return
    }
    setConfirmationSent(true)
  }

  if (confirmationSent) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle as="h1" className="text-2xl">
              Vérifie ta boîte mail
            </CardTitle>
            <CardDescription>
              Un email de confirmation a été envoyé à {email}. Clique sur le lien pour
              activer ton compte, puis reviens te connecter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login">
              <Button variant="outline" className="w-full">
                Retour à la connexion
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle as="h1" className="text-2xl">
            Créer un compte
          </CardTitle>
          <CardDescription>Démarre ton suivi d'entraînement</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mot de passe</Label>
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
              {isSubmitting ? 'Création…' : 'Créer le compte'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <Link
              to="/login"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
