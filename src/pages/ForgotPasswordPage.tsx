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

export function ForgotPasswordPage() {
  const status = useAuthStore((state) => state.status)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [linkSent, setLinkSent] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}update-password`,
    })

    setIsSubmitting(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setLinkSent(true)
  }

  if (linkSent) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle as="h1" className="text-2xl">
              Vérifie ta boîte mail
            </CardTitle>
            <CardDescription>
              Si un compte existe avec l'adresse {email}, un lien de réinitialisation vient
              d'être envoyé. Clique dessus pour choisir un nouveau mot de passe.
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
    <main className="flex min-h-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle as="h1" className="text-2xl">
            Mot de passe oublié
          </CardTitle>
          <CardDescription>
            Indique ton email, on t'envoie un lien pour choisir un nouveau mot de passe.
          </CardDescription>
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
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Envoi…' : 'Envoyer le lien'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link
              to="/login"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Retour à la connexion
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
