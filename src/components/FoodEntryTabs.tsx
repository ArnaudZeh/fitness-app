import { useState } from 'react'
import { Barcode, Camera, ChefHat, Search } from 'lucide-react'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { CommonDishPicker } from '@/components/CommonDishPicker'
import { NutritionLabelPhotoCapture } from '@/components/NutritionLabelPhotoCapture'
import { type FoodSelection, OpenFoodFactsSearch } from '@/components/OpenFoodFactsSearch'
import { Button } from '@/components/ui/button'
import type { CommonDish } from '@/lib/common-dishes'

type EntryMethod = 'search' | 'scan' | 'photo' | 'dishes'

const METHODS: { id: EntryMethod; label: string; icon: typeof Search }[] = [
  { id: 'search', label: 'Rechercher', icon: Search },
  { id: 'scan', label: 'Scanner', icon: Barcode },
  { id: 'photo', label: 'Photo', icon: Camera },
  { id: 'dishes', label: 'Plats', icon: ChefHat },
]

interface FoodEntryTabsProps {
  onSelect: (selection: FoodSelection) => void
  // Distinct from onSelect: a common dish logs its fixed total directly
  // (P4, "quick-add") rather than prefilling the per-100g/quantity form
  // the other three methods feed — see project history for the scoping
  // decision (one-tap add, not a form prefill).
  onQuickAdd: (dish: CommonDish) => Promise<void>
}

// The camera/search/editorial-list ways to prefill (or, for "Plats",
// directly log) the manual form below, always available side by side (not
// gated behind, say, a failed barcode scan) — user's explicit choice when
// the photo-of-the-label option was added alongside the pre-existing search.
export function FoodEntryTabs({ onSelect, onQuickAdd }: FoodEntryTabsProps) {
  const [method, setMethod] = useState<EntryMethod>('search')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1 self-start rounded-lg border border-border p-0.5">
        {METHODS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={method === id ? 'default' : 'ghost'}
            onClick={() => setMethod(id)}
          >
            <Icon className="size-4" /> {label}
          </Button>
        ))}
      </div>
      {method === 'search' && <OpenFoodFactsSearch onSelect={onSelect} />}
      {method === 'scan' && <BarcodeScanner onSelect={onSelect} />}
      {method === 'photo' && <NutritionLabelPhotoCapture onSelect={onSelect} />}
      {method === 'dishes' && <CommonDishPicker onAdd={onQuickAdd} />}
    </div>
  )
}
