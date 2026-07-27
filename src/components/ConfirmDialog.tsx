import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ConfirmDialogProps {
  trigger: React.ReactNode
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<void>
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setIsConfirming(true)
    setError(null)
    try {
      await onConfirm()
      setOpen(false)
    } catch (err) {
      // Previously uncaught: a rejected onConfirm (e.g. an RLS-denied
      // delete) surfaced nothing at all — the dialog just sat there with no
      // explanation, indistinguishable from "nothing happened".
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isConfirming}
            onClick={() => void handleConfirm()}
          >
            {isConfirming ? 'Suppression…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
