import { useMemo, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { type CommonDish, searchCommonDishes } from '@/lib/common-dishes'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CommonDishPickerProps {
  onAdd: (dish: CommonDish) => Promise<void>
}

// Browsable, not search-gated like OpenFoodFactsSearch — the whole editorial
// list is short enough to scroll, and an empty query already returns every
// entry (searchCommonDishes('') matches everything), so there's no separate
// "recents"/empty state to design here.
export function CommonDishPicker({ onAdd }: CommonDishPickerProps) {
  const [query, setQuery] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const results = useMemo(() => searchCommonDishes(query.trim()), [query])

  async function handleAdd(dish: CommonDish) {
    setError(null)
    setAddingId(dish.id)
    try {
      await onAdd(dish)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="dish-search">Plats courants</Label>
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="dish-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex : poulet, pâtes, wrap…"
          className="pl-9"
        />
      </div>
      {results.length > 0 ? (
        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border border-border p-1">
          {results.map((dish) => (
            <li key={dish.id}>
              <button
                type="button"
                disabled={addingId !== null}
                onClick={() => void handleAdd(dish)}
                className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
              >
                <span className="flex flex-col items-start gap-0.5">
                  <span>{dish.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {dish.calories} kcal · P {dish.proteinG}g · G {dish.carbsG}g · L {dish.fatG}g
                  </span>
                </span>
                {addingId === dish.id && <Loader2 className="size-4 shrink-0 animate-spin" />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Aucun plat ne correspond à cette recherche.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
