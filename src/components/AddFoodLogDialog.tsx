import { type FormEvent, useState } from 'react'
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
import { useCreateFoodLog } from '@/hooks/useFoodLogs'

interface AddFoodLogDialogProps {
  trigger: React.ReactNode
  mealSlotId: string
  loggedDate: string
}

export function AddFoodLogDialog({ trigger, mealSlotId, loggedDate }: AddFoodLogDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [proteinG, setProteinG] = useState('')
  const [carbsG, setCarbsG] = useState('')
  const [fatG, setFatG] = useState('')
  const [error, setError] = useState<string | null>(null)
  const createFoodLog = useCreateFoodLog()

  function reset() {
    setName('')
    setCalories('')
    setProteinG('')
    setCarbsG('')
    setFatG('')
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const parsedCalories = Number(calories)
    if (name.trim() === '' || calories.trim() === '' || Number.isNaN(parsedCalories)) {
      setError('Nom et calories sont obligatoires.')
      return
    }
    try {
      await createFoodLog.mutateAsync({
        meal_slot_id: mealSlotId,
        logged_date: loggedDate,
        name: name.trim(),
        calories: parsedCalories,
        protein_g: proteinG.trim() === '' ? null : Number(proteinG),
        carbs_g: carbsG.trim() === '' ? null : Number(carbsG),
        fat_g: fatG.trim() === '' ? null : Number(fatG),
      })
      setOpen(false)
      reset()
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
          <DialogTitle>Ajouter un aliment</DialogTitle>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="food-name">Aliment</Label>
            <Input
              id="food-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex : Riz blanc, 150g"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="food-calories">Calories (kcal)</Label>
            <Input
              id="food-calories"
              type="number"
              min={0}
              value={calories}
              onChange={(event) => setCalories(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="food-protein">Protéines (g)</Label>
              <Input
                id="food-protein"
                type="number"
                min={0}
                value={proteinG}
                onChange={(event) => setProteinG(event.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="food-carbs">Glucides (g)</Label>
              <Input
                id="food-carbs"
                type="number"
                min={0}
                value={carbsG}
                onChange={(event) => setCarbsG(event.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="food-fat">Lipides (g)</Label>
              <Input
                id="food-fat"
                type="number"
                min={0}
                value={fatG}
                onChange={(event) => setFatG(event.target.value)}
                placeholder="Optionnel"
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={createFoodLog.isPending}>
              {createFoodLog.isPending ? 'Ajout…' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
