import { type FormEvent, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

// Re-verifies the current password (a fresh signInWithPassword) before
// allowing the change, rather than trusting the existing session alone —
// scoped via AskUserQuestion: protects against a left-unlocked device
// walking away with full account takeover, at the cost of one extra field.
export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function reset() {
    setCurrentPassword('')
    setNewPassword('')
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
      setError('Session invalide, reconnecte-toi.')
      return
    }

    setIsSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) {
      setIsSubmitting(false)
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Mot de passe actuel incorrect.'
          : signInError.message,
      )
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setIsSubmitting(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setOpen(false)
    reset()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Sécurité</CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog
          open={open}
          onOpenChange={(next: boolean) => {
            setOpen(next)
            if (!next) reset()
          }}
        >
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <KeyRound /> Changer mon mot de passe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Changer mon mot de passe</DialogTitle>
            </DialogHeader>
            <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="current-password">Mot de passe actuel</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
