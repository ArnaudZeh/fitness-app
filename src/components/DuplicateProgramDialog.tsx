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
import { useSetHistory } from '@/hooks/useAnalytics'
import { parseLocaleNumber } from '@/lib/number-input'
import { computeRecentAverageWeightByExercise } from '@/lib/analytics'
import {
  DEFAULT_DELOAD_REDUCTION_PERCENT,
  DELOAD_REDUCTION_OPTIONS,
  FOCUS_LOAD_REDUCTION_RANGE,
  FOCUS_REP_RANGE,
  PROGRAM_FOCUS_LABELS,
  suggestFocusLoadAdjustmentPercent,
  suggestRpeAdjustmentPoints,
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
  const { data: history } = useSetHistory()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(`${program.name} (copie)`)
  const [focus, setFocus] = useState<ProgramFocus>(program.focus)
  const [adjustmentPercent, setAdjustmentPercent] = useState('0')
  const [rpeAdjustmentPoints, setRpeAdjustmentPoints] = useState('0')
  const [error, setError] = useState<string | null>(null)

  // A real training-zone change — deload involved on either end keeps its
  // own dedicated mechanism (DELOAD_REDUCTION_OPTIONS + RPE tied to that
  // same percent), never the new reps-by-focus table or the RPE points
  // field below.
  const isRealFocusChange = focus !== program.focus && focus !== 'deload' && program.focus !== 'deload'
  const destLoadRange = focus !== 'deload' ? FOCUS_LOAD_REDUCTION_RANGE[focus] : null
  const destRepRange = focus !== 'deload' ? FOCUS_REP_RANGE[focus] : null

  function reset() {
    setName(`${program.name} (copie)`)
    setFocus(program.focus)
    setAdjustmentPercent('0')
    setRpeAdjustmentPoints('0')
    setError(null)
  }

  function handleFocusChange(nextFocus: ProgramFocus) {
    setFocus(nextFocus)
    setRpeAdjustmentPoints(String(suggestRpeAdjustmentPoints(program.focus, nextFocus)))
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
    let rpePoints = 0
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

      if (isRealFocusChange) {
        const parsedRpePoints = parseLocaleNumber(rpeAdjustmentPoints)
        if (Number.isNaN(parsedRpePoints)) {
          setError('Merci d’indiquer un ajustement RPE valide.')
          return
        }
        rpePoints = parsedRpePoints
      }
    }
    try {
      const newProgram = await duplicateProgram.mutateAsync({
        program,
        newName: name.trim(),
        options: {
          focus,
          loadAdjustmentPercent,
          rpeAdjustmentPoints: rpePoints,
          recentAverageWeightByExercise: computeRecentAverageWeightByExercise(history ?? []),
        },
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
              La copie garde les mêmes exercices et le même nombre de séries. Si le focus change
              vraiment (hors deload), les répétitions cibles s'ajustent aussi à la nouvelle zone
              d'entraînement — plus basses sur les exercices polyarticulaires que sur l'isolation
              — en plus de la charge et du RPE cibles ci-dessous. Pour un exercice sans charge
              cible déjà renseignée, la moyenne de tes 3 dernières séances loguées sert de point
              de départ.
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
                  ? 'Appliquée à la charge et au RPE cible de chaque exercice : une réduction de 30 à 50% est la fourchette modérée à prononcée courante pour une semaine de décharge en périodisation (un RPE 9-10 redescend ainsi autour de 5-6, l\'effort typique d\'un deload). Laissée inchangée pour les exercices sans charge de référence ou en assistance.'
                  : isRealFocusChange && destLoadRange && destRepRange
                    ? `Appliquée à la charge cible de chaque exercice (polyarticulaire et isolation). Repère pour ${PROGRAM_FOCUS_LABELS[focus]} : ${destLoadRange.min}-${destLoadRange.max}% de réduction, répétitions ${destRepRange.compound.min}-${destRepRange.compound.max} sur le polyarticulaire et ${destRepRange.isolation.min}-${destRepRange.isolation.max} sur l'isolation. Ajustable si besoin.`
                    : "Le deload n'a pas de zone de charge de référence propre (elle dépend de la réduction appliquée à la duplication précédente), donc aucune valeur n'est suggérée automatiquement ici. Ajuste si besoin."}
              </p>
            </div>
          )}
          {isRealFocusChange && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="duplicate-rpe-adjustment">Ajustement RPE (points)</Label>
              <Input
                id="duplicate-rpe-adjustment"
                type="text"
                inputMode="decimal"
                value={rpeAdjustmentPoints}
                onChange={(event) => setRpeAdjustmentPoints(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ajouté directement au RPE cible de chaque exercice (une valeur négative le
                baisse) — indépendant de l'ajustement de charge ci-dessus. Pré-rempli à -1 : à
                ajuster si tes RPE enregistrés ne sont pas surestimés chez toi.
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
