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
import { computeFoodLogTotals } from '@/lib/nutrition-calc'

interface AddFoodLogDialogProps {
  trigger: React.ReactNode
  mealSlotId: string
  loggedDate: string
}

export function AddFoodLogDialog({ trigger, mealSlotId, loggedDate }: AddFoodLogDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [quantityG, setQuantityG] = useState('100')
  const [caloriesPer100g, setCaloriesPer100g] = useState('')
  const [proteinPer100g, setProteinPer100g] = useState('')
  const [carbsPer100g, setCarbsPer100g] = useState('')
  const [fatPer100g, setFatPer100g] = useState('')
  const [error, setError] = useState<string | null>(null)
  const createFoodLog = useCreateFoodLog()

  function reset() {
    setName('')
    setQuantityG('100')
    setCaloriesPer100g('')
    setProteinPer100g('')
    setCarbsPer100g('')
    setFatPer100g('')
    setError(null)
  }

  const parsedQuantity = Number(quantityG)
  const parsedCaloriesPer100g = Number(caloriesPer100g)
  const hasValidBase =
    quantityG.trim() !== '' &&
    !Number.isNaN(parsedQuantity) &&
    parsedQuantity > 0 &&
    caloriesPer100g.trim() !== '' &&
    !Number.isNaN(parsedCaloriesPer100g)

  const preview = hasValidBase
    ? computeFoodLogTotals({
        quantityG: parsedQuantity,
        caloriesPer100g: parsedCaloriesPer100g,
        proteinGPer100g: proteinPer100g.trim() === '' ? null : Number(proteinPer100g),
        carbsGPer100g: carbsPer100g.trim() === '' ? null : Number(carbsPer100g),
        fatGPer100g: fatPer100g.trim() === '' ? null : Number(fatPer100g),
      })
    : null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (name.trim() === '' || !hasValidBase || !preview) {
      setError('Nom, quantité et calories pour 100g sont obligatoires.')
      return
    }
    try {
      await createFoodLog.mutateAsync({
        meal_slot_id: mealSlotId,
        logged_date: loggedDate,
        name: name.trim(),
        quantity_g: parsedQuantity,
        calories_per_100g: parsedCaloriesPer100g,
        protein_g_per_100g: proteinPer100g.trim() === '' ? null : Number(proteinPer100g),
        carbs_g_per_100g: carbsPer100g.trim() === '' ? null : Number(carbsPer100g),
        fat_g_per_100g: fatPer100g.trim() === '' ? null : Number(fatPer100g),
        calories: preview.calories,
        protein_g: preview.proteinG,
        carbs_g: preview.carbsG,
        fat_g: preview.fatG,
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
              placeholder="Ex : Riz blanc"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="food-quantity">Quantité (g)</Label>
            <Input
              id="food-quantity"
              type="number"
              min={1}
              value={quantityG}
              onChange={(event) => setQuantityG(event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Valeurs pour 100g — comme sur l'étiquette nutritionnelle.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="food-calories">Calories pour 100g (kcal)</Label>
            <Input
              id="food-calories"
              type="number"
              min={0}
              value={caloriesPer100g}
              onChange={(event) => setCaloriesPer100g(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="food-protein">Protéines /100g</Label>
              <Input
                id="food-protein"
                type="number"
                min={0}
                value={proteinPer100g}
                onChange={(event) => setProteinPer100g(event.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="food-carbs">Glucides /100g</Label>
              <Input
                id="food-carbs"
                type="number"
                min={0}
                value={carbsPer100g}
                onChange={(event) => setCarbsPer100g(event.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="food-fat">Lipides /100g</Label>
              <Input
                id="food-fat"
                type="number"
                min={0}
                value={fatPer100g}
                onChange={(event) => setFatPer100g(event.target.value)}
                placeholder="Optionnel"
              />
            </div>
          </div>
          {preview && (
            <p className="text-sm text-muted-foreground">
              Pour {quantityG}g : <span className="font-medium">{preview.calories} kcal</span>
              {preview.proteinG !== null ? ` · P ${preview.proteinG}g` : ''}
              {preview.carbsG !== null ? ` · G ${preview.carbsG}g` : ''}
              {preview.fatG !== null ? ` · L ${preview.fatG}g` : ''}
            </p>
          )}
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
