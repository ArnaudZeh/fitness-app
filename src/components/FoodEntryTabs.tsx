import { useState } from 'react'
import { Barcode, Camera, Search } from 'lucide-react'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { NutritionLabelPhotoCapture } from '@/components/NutritionLabelPhotoCapture'
import { type FoodSelection, OpenFoodFactsSearch } from '@/components/OpenFoodFactsSearch'
import { Button } from '@/components/ui/button'

type EntryMethod = 'search' | 'scan' | 'photo'

const METHODS: { id: EntryMethod; label: string; icon: typeof Search }[] = [
  { id: 'search', label: 'Rechercher', icon: Search },
  { id: 'scan', label: 'Scanner', icon: Barcode },
  { id: 'photo', label: 'Photo', icon: Camera },
]

interface FoodEntryTabsProps {
  onSelect: (selection: FoodSelection) => void
}

// The three camera/search-based ways to prefill the manual form below,
// always available side by side (not gated behind, say, a failed barcode
// scan) — user's explicit choice when the photo-of-the-label option was
// added alongside the pre-existing search.
export function FoodEntryTabs({ onSelect }: FoodEntryTabsProps) {
  const [method, setMethod] = useState<EntryMethod>('search')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 self-start rounded-lg border border-border p-0.5">
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
    </div>
  )
}
