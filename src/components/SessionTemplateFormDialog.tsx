import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface SessionTemplateFormDialogProps {
  trigger: React.ReactNode
  initialName?: string
  submitLabel: string
  onSubmit: (name: string) => Promise<void>
}

export function SessionTemplateFormDialog({
  trigger,
  initialName,
  submitLabel,
  onSubmit,
}: SessionTemplateFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(name)
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{submitLabel}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="session-template-name">Nom du jour</Label>
            <Input
              id="session-template-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Jour A — Push"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
