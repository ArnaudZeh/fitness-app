import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateMealSlot } from '@/hooks/useMealSlots'

const PRESET_COUNTS = [3, 4, 5, 6]

export function MealSlotOnboarding() {
  const [customCount, setCustomCount] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const createMealSlot = useCreateMealSlot()

  async function createSlots(count: number) {
    if (count <= 0 || isCreating) return
    setIsCreating(true)
    try {
      // Sequential, not Promise.all: each insert needs its own order_index,
      // and there's no batch-insert helper here — a handful of repas is a
      // tiny, one-time list, not worth the complexity of computing offsets
      // up front.
      for (let i = 0; i < count; i++) {
        await createMealSlot.mutateAsync({ name: `Repas ${i + 1}`, orderIndex: i })
      }
    } finally {
      setIsCreating(false)
    }
  }

  function handleCustomSubmit(event: FormEvent) {
    event.preventDefault()
    const count = Number(customCount)
    if (!Number.isInteger(count) || count <= 0) return
    void createSlots(count)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-lg">
          Combien de repas par jour ?
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Tu pourras renommer, ajouter ou supprimer des repas à tout moment ensuite.
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COUNTS.map((count) => (
            <Button
              key={count}
              type="button"
              variant="outline"
              disabled={isCreating}
              onClick={() => void createSlots(count)}
            >
              {count} repas
            </Button>
          ))}
        </div>
        <form onSubmit={handleCustomSubmit} className="flex items-end gap-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="custom-meal-count">Autre nombre</Label>
            <Input
              id="custom-meal-count"
              type="number"
              min={1}
              value={customCount}
              onChange={(event) => setCustomCount(event.target.value)}
              className="w-24"
            />
          </div>
          <Button type="submit" variant="outline" disabled={isCreating || customCount.trim() === ''}>
            Valider
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
