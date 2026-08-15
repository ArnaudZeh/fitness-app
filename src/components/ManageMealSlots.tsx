import { type FormEvent, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  useCreateMealSlot,
  useRemoveMealSlot,
  useRenameMealSlot,
} from '@/hooks/useMealSlots'
import { nextOrderIndex } from '@/lib/ordering'
import type { MealSlot } from '@/lib/meal-slots-api'

interface ManageMealSlotsProps {
  mealSlots: MealSlot[]
}

function MealSlotRow({ slot }: { slot: MealSlot }) {
  const [name, setName] = useState(slot.name)
  const renameMealSlot = useRenameMealSlot()
  const removeMealSlot = useRemoveMealSlot()

  function handleBlur() {
    const trimmed = name.trim()
    if (trimmed === '' || trimmed === slot.name) {
      setName(slot.name)
      return
    }
    void renameMealSlot.mutate({ id: slot.id, name: trimmed })
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={handleBlur}
        aria-label={`Renommer ${slot.name}`}
      />
      <ConfirmDialog
        trigger={
          <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer ${slot.name}`}>
            <Trash2 className="text-destructive" />
          </Button>
        }
        title="Supprimer ce repas ?"
        description={`« ${slot.name} » ne sera plus proposé. L'historique déjà loggé pour ce repas est conservé.`}
        confirmLabel="Supprimer"
        onConfirm={() => removeMealSlot.mutateAsync(slot.id)}
      />
    </div>
  )
}

export function ManageMealSlots({ mealSlots }: ManageMealSlotsProps) {
  const [newName, setNewName] = useState('')
  const createMealSlot = useCreateMealSlot()

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    const trimmed = newName.trim()
    if (trimmed === '') return
    await createMealSlot.mutateAsync({ name: trimmed, orderIndex: nextOrderIndex(mealSlots) })
    setNewName('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-lg">
          Mes repas
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {mealSlots.map((slot) => (
          <MealSlotRow key={slot.id} slot={slot} />
        ))}
        <form onSubmit={(event) => void handleAdd(event)} className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Ajouter un repas (ex : Collation)"
          />
          <Button type="submit" variant="outline" size="icon" disabled={newName.trim() === ''}>
            <Plus />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
