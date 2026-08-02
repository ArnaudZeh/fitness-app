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
import { computeBlocks } from '@/lib/ordering'
import type { LinkTarget } from '@/lib/ordering'
import type { SessionTemplateExercise } from '@/lib/sessions-api'

interface LinkSupersetDialogProps {
  trigger: React.ReactNode
  currentSlot: SessionTemplateExercise
  daySlots: SessionTemplateExercise[]
  onLink: (target: LinkTarget<SessionTemplateExercise>) => Promise<void>
}

export function LinkSupersetDialog({
  trigger,
  currentSlot,
  daySlots,
  onLink,
}: LinkSupersetDialogProps) {
  const [open, setOpen] = useState(false)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Every other exercise/group of the day, minus currentSlot's own block
  // (always a lone single — this dialog is only offered on ungrouped
  // slots, see SessionTemplateCard).
  const targets = computeBlocks(daySlots).filter(
    (block) => !(block.kind === 'single' && block.slot.id === currentSlot.id),
  )

  async function handlePick(key: string, target: LinkTarget<SessionTemplateExercise>) {
    setPendingKey(key)
    setError(null)
    try {
      await onLink(target)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setPendingKey(null)
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
          <DialogTitle>Lier {currentSlot.exercise.name} en superset</DialogTitle>
          <DialogDescription>
            Choisis un autre exercice — ou un superset déjà existant — de ce jour pour les
            enchaîner ensemble.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun autre exercice ce jour-là pour l'instant.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {targets.map((block) => {
              const key = block.kind === 'single' ? block.slot.id : `group-${block.group}`
              const label =
                block.kind === 'single'
                  ? block.slot.exercise.name
                  : `Superset ${block.group} · ${block.slots.map((slot) => slot.exercise.name).join(' + ')}`
              const target: LinkTarget<SessionTemplateExercise> =
                block.kind === 'single'
                  ? { kind: 'single', slot: block.slot }
                  : { kind: 'group', group: block.group, slots: block.slots }
              return (
                <li key={key}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    disabled={pendingKey !== null}
                    onClick={() => void handlePick(key, target)}
                  >
                    {pendingKey === key ? 'Liaison…' : label}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
