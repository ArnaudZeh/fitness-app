import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDuplicateProgram } from '@/hooks/usePrograms'
import { parseLocaleNumber } from '@/lib/number-input'
import { PROGRAM_FOCUS_LABELS, type Program, type ProgramFocus } from '@/lib/programs-api'

const FOCUS_OPTIONS = Object.entries(PROGRAM_FOCUS_LABELS) as [ProgramFocus, string][]
const DEFAULT_DELOAD_REDUCTION_PERCENT = '15'

interface DuplicateProgramDialogProps {
  trigger: React.ReactNode
  program: Program
}

export function DuplicateProgramDialog({ trigger, program }: DuplicateProgramDialogProps) {
  const navigate = useNavigate()
  const duplicateProgram = useDuplicateProgram()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(`${program.name} (copie)`)
  const [focus, setFocus] = useState<ProgramFocus>(program.focus)
  const [reductionPercent, setReductionPercent] = useState(DEFAULT_DELOAD_REDUCTION_PERCENT)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName(`${program.name} (copie)`)
    setFocus(program.focus)
    setReductionPercent(DEFAULT_DELOAD_REDUCTION_PERCENT)
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (name.trim() === '') {
      setError('Le nom est obligatoire.')
      return
    }
    const parsedReduction = parseLocaleNumber(reductionPercent)
    const loadReductionPercent =
      focus === 'deload' && !Number.isNaN(parsedReduction) ? parsedReduction : 0
    try {
      const newProgram = await duplicateProgram.mutateAsync({
        program,
        newName: name.trim(),
        options: { focus, loadReductionPercent },
      })
      setOpen(false)
      void navigate(`/programs/${newProgram.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dupliquer le programme</DialogTitle>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="duplicate-name">Nom</Label>
            <Input
              id="duplicate-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="duplicate-focus">Focus</Label>
            <Select
              value={focus}
              onValueChange={(value: string) => setFocus(value as ProgramFocus)}
            >
              <SelectTrigger id="duplicate-focus">
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
            <p className="text-xs text-muted-foreground">
              La copie garde exactement les mêmes exercices, c'est le point de départ pour
              ajuster séries, répétitions, RPE et charges toi-même selon ce nouvel objectif.
            </p>
          </div>
          {focus === 'deload' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="duplicate-reduction">Réduction de charge (%)</Label>
              <Input
                id="duplicate-reduction"
                type="text"
                inputMode="decimal"
                value={reductionPercent}
                onChange={(event) => setReductionPercent(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Appliquée à la charge de référence de chaque exercice (15% par défaut, une
                réduction modérée courante pour une semaine de décharge). Laissée inchangée pour
                les exercices sans charge de référence ou en assistance.
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={duplicateProgram.isPending}>
              {duplicateProgram.isPending ? 'Duplication…' : 'Dupliquer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
