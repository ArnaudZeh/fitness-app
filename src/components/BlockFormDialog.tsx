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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BLOCK_FOCUS_LABELS,
  BLOCK_TYPE_LABELS,
  type BlockFocus,
  type BlockInput,
  type BlockType,
} from '@/lib/programs-api'

const FOCUS_OPTIONS = Object.entries(BLOCK_FOCUS_LABELS) as [BlockFocus, string][]
const TYPE_OPTIONS = Object.entries(BLOCK_TYPE_LABELS) as [BlockType, string][]

interface BlockFormDialogProps {
  trigger: React.ReactNode
  initialValue?: BlockInput
  onSubmit: (input: BlockInput) => Promise<void>
  submitLabel: string
}

export function BlockFormDialog({
  trigger,
  initialValue,
  onSubmit,
  submitLabel,
}: BlockFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialValue?.name ?? '')
  const [focus, setFocus] = useState<BlockFocus>(initialValue?.focus ?? 'hypertrophie')
  const [blockType, setBlockType] = useState<BlockType>(
    initialValue?.block_type ?? 'accumulation',
  )
  const [durationWeeks, setDurationWeeks] = useState(initialValue?.duration_weeks ?? 4)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({
        name,
        focus,
        block_type: blockType,
        duration_weeks: durationWeeks,
      })
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
            <Label htmlFor="block-name">Nom du bloc</Label>
            <Input
              id="block-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Semaines 1-4"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="block-focus">Focus</Label>
            <Select
              value={focus}
              onValueChange={(value: string) => setFocus(value as BlockFocus)}
            >
              <SelectTrigger id="block-focus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOCUS_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="block-type">Type de bloc</Label>
            <Select
              value={blockType}
              onValueChange={(value: string) => setBlockType(value as BlockType)}
            >
              <SelectTrigger id="block-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="block-duration">Durée (semaines)</Label>
            <Input
              id="block-duration"
              type="number"
              min={1}
              max={52}
              required
              value={durationWeeks}
              onChange={(event) => setDurationWeeks(Number(event.target.value))}
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
