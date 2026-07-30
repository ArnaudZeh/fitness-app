import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { WEEKDAY_LABELS } from '@/lib/sessions-api'
import type { SessionTemplate } from '@/lib/sessions-api'

interface DuplicateDayDialogProps {
  trigger: React.ReactNode
  sourceTemplate: SessionTemplate
  otherTemplates: SessionTemplate[]
  onDuplicate: (targetTemplateId: string) => Promise<void>
}

export function DuplicateDayDialog({
  trigger,
  sourceTemplate,
  otherTemplates,
  onDuplicate,
}: DuplicateDayDialogProps) {
  const [open, setOpen] = useState(false)
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handlePick(targetId: string) {
    setPendingTargetId(targetId)
    setError(null)
    try {
      await onDuplicate(targetId)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setPendingTargetId(null)
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
          <DialogTitle>Dupliquer {WEEKDAY_LABELS[sourceTemplate.day_of_week]} vers…</DialogTitle>
          <DialogDescription>
            Remplace les exercices du jour choisi par ceux de{' '}
            {WEEKDAY_LABELS[sourceTemplate.day_of_week]}.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <ul className="flex flex-col gap-1.5">
          {otherTemplates.map((target) => (
            <li key={target.id}>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                disabled={pendingTargetId !== null}
                onClick={() => void handlePick(target.id)}
              >
                {pendingTargetId === target.id
                  ? 'Duplication…'
                  : WEEKDAY_LABELS[target.day_of_week]}
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
