import { useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useRecentFoodLogNames } from '@/hooks/useFoodLogs'
import { useOpenFoodFactsSearch } from '@/hooks/useOpenFoodFactsSearch'

export interface FoodSelection {
  name: string
  caloriesPer100g: number
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
}

interface OpenFoodFactsSearchProps {
  onSelect: (selection: FoodSelection) => void
}

export function OpenFoodFactsSearch({ onSelect }: OpenFoodFactsSearchProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 400)
  const {
    data: results,
    isFetching,
    isError,
  } = useOpenFoodFactsSearch(debouncedQuery)
  const { data: recents } = useRecentFoodLogNames()

  const showResults = debouncedQuery.trim().length >= 2
  const showRecents = !showResults && recents !== undefined && recents.length > 0

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="food-search">Rechercher un aliment</Label>
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="food-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex : riz, poulet, yaourt…"
          className="pl-9"
          autoFocus
        />
      </div>

      {showRecents && (
        <div className="flex flex-wrap gap-2">
          {recents.map((food) => (
            <button
              key={food.name}
              type="button"
              onClick={() =>
                onSelect({
                  name: food.name,
                  caloriesPer100g: food.caloriesPer100g,
                  proteinPer100g: food.proteinPer100g,
                  carbsPer100g: food.carbsPer100g,
                  fatPer100g: food.fatPer100g,
                })
              }
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {food.name}
            </button>
          ))}
        </div>
      )}

      {showResults && (
        <div className="flex flex-col gap-1">
          {isFetching && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Recherche en cours.
            </p>
          )}
          {isError && (
            <p className="text-xs text-destructive">Recherche indisponible pour le moment.</p>
          )}
          {!isFetching && results && results.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Aucun résultat. Tu peux saisir les valeurs toi-même ci-dessous.
            </p>
          )}
          {results && results.length > 0 && (
            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-border p-1">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() =>
                      onSelect({
                        name: result.name,
                        caloriesPer100g: result.caloriesPer100g,
                        proteinPer100g: result.proteinPer100g,
                        carbsPer100g: result.carbsPer100g,
                        fatPer100g: result.fatPer100g,
                      })
                    }
                    className="flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <span>
                      {result.name}
                      {result.brand ? ` · ${result.brand}` : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {result.caloriesPer100g} kcal/100g
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
