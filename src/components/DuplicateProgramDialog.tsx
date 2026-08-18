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
import {
  DEFAULT_DELOAD_REDUCTION_PERCENT,
  DELOAD_REDUCTION_OPTIONS,
  FOCUS_REFERENCE_1RM_PERCENT,
  PROGRAM_FOCUS_LABELS,
  suggestFocusLoadAdjustmentPercent,
  type Program,
  type ProgramFocus,
} from '@/lib/programs-api'

const FOCUS_OPTIONS = Object.entries(PROGRAM_FOCUS_LABELS) as [ProgramFocus, string][]

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
  const [adjustmentPercent, setAdjustmentPercent] = useState('0')
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName(`${program.name} (copie)`)
    setFocus(program.focus)
    setAdjustmentPercent('0')
    setError(null)
  }

  function handleFocusChange(nextFocus: ProgramFocus) {
    setFocus(nextFocus)
    if (nextFocus === program.focus) {
      setAdjustmentPercent('0')
    } else if (nextFocus === 'deload') {
      setAdjustmentPercent(String(DEFAULT_DELOAD_REDUCTION_PERCENT))
    } else {
      setAdjustmentPercent(String(suggestFocusLoadAdjustmentPercent(program.focus, nextFocus)))
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (name.trim() === '') {
      setError('Le nom est obligatoire.')
      return
    }
    let loadAdjustmentPercent = 0
    if (focus !== program.focus) {
      const parsedAdjustment = parseLocaleNumber(adjustmentPercent)
      if (Number.isNaN(parsedAdjustment)) {
        setError('Merci d’indiquer un ajustement de charge valide.')
        return
      }
      const minDeloadReduction = Math.min(...DELOAD_REDUCTION_OPTIONS)
      const maxDeloadReduction = Math.max(...DELOAD_REDUCTION_OPTIONS)
      if (
        focus === 'deload' &&
        (parsedAdjustment < minDeloadReduction || parsedAdjustment > maxDeloadReduction)
      ) {
        setError(
          `La réduction de charge doit être comprise entre ${minDeloadReduction}% et ${maxDeloadReduction}%.`,
        )
        return
      }
      loadAdjustmentPercent = parsedAdjustment
    }
    try {
      const newProgram = await duplicateProgram.mutateAsync({
        program,
        newName: name.trim(),
        options: { focus, loadAdjustmentPercent },
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
              onValueChange={(value: string) => handleFocusChange(value as ProgramFocus)}
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
          {focus !== program.focus && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="duplicate-adjustment">
                {focus === 'deload' ? 'Réduction de charge' : 'Ajustement de charge (%)'}
              </Label>
              {focus === 'deload' ? (
                <Select value={adjustmentPercent} onValueChange={setAdjustmentPercent}>
                  <SelectTrigger id="duplicate-adjustment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELOAD_REDUCTION_OPTIONS.map((percent) => (
                      <SelectItem key={percent} value={String(percent)}>
                        -{percent}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="duplicate-adjustment"
                  type="text"
                  inputMode="decimal"
                  value={adjustmentPercent}
                  onChange={(event) => setAdjustmentPercent(event.target.value)}
                />
              )}
              <p className="text-xs text-muted-foreground">
                {focus === 'deload'
                  ? 'Appliquée à la charge de référence de chaque exercice — une réduction de 30 à 50% est la fourchette modérée à prononcée courante pour une semaine de décharge en périodisation. Laissée inchangée pour les exercices sans charge de référence ou en assistance.'
                  : program.focus !== 'deload'
                    ? `Valeur suggérée à partir des zones de charge de travail par objectif (Force ≈${FOCUS_REFERENCE_1RM_PERCENT.force}% 1RM, Hypertrophie ≈${FOCUS_REFERENCE_1RM_PERCENT.hypertrophie}% 1RM, Endurance ≈${FOCUS_REFERENCE_1RM_PERCENT.endurance}% 1RM, d'après les repères NSCA). Une valeur négative augmente la charge, positive la réduit — ajustable si besoin.`
                    : "Le deload n'a pas de zone de charge de référence propre (elle dépend de la réduction appliquée à la duplication précédente), donc aucune valeur n'est suggérée automatiquement ici. Ajuste si besoin."}
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
