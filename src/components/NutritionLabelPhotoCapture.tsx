import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { Link } from 'react-router'
import type { FoodSelection } from '@/components/OpenFoodFactsSearch'
import { Button } from '@/components/ui/button'
import { useAiProviderKeys } from '@/hooks/useAiProviderKeys'
import { useAnalyzeNutritionLabel } from '@/hooks/useNutritionLabelPhoto'
import { AI_PROVIDER_LABELS, type AiProvider } from '@/lib/ai-keys-api'
import { compressImage } from '@/lib/image-compression'

interface NutritionLabelPhotoCaptureProps {
  onSelect: (selection: FoodSelection) => void
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(new Error("Échec de la lecture de l'image."))
    reader.readAsDataURL(blob)
  })
}

// Second, camera-based way to log a product without typing values by hand
// (alongside BarcodeScanner) — meant for when a barcode isn't referenced on
// OpenFoodFacts, but always available rather than gated behind a failed
// scan (user's explicit choice). Vision extraction via the same BYOK
// infra as every other AI feature: costs the user's own provider quota.
export function NutritionLabelPhotoCapture({ onSelect }: NutritionLabelPhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: keyStatuses } = useAiProviderKeys()
  const analyzeNutritionLabel = useAnalyzeNutritionLabel()
  const [selectedProvider, setSelectedProvider] = useState<AiProvider | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [notReadable, setNotReadable] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const configuredProviders = (keyStatuses ?? [])
    .filter((status) => status.is_valid)
    .map((status) => status.provider)
  const activeProvider = selectedProvider ?? configuredProviders[0] ?? null

  async function handleFile(file: File) {
    if (!activeProvider) return
    setNotReadable(false)
    setErrorMessage(null)
    setIsPreparing(true)
    try {
      const compressed = await compressImage(file)
      const imageBase64 = await blobToBase64(compressed)
      const extraction = await analyzeNutritionLabel.mutateAsync({
        provider: activeProvider,
        imageBase64,
      })
      if (!extraction.extracted || extraction.caloriesPer100g === null) {
        setNotReadable(true)
        return
      }
      onSelect({
        name: extraction.name ?? '',
        caloriesPer100g: extraction.caloriesPer100g,
        proteinPer100g: extraction.proteinPer100g,
        carbsPer100g: extraction.carbsPer100g,
        fatPer100g: extraction.fatPer100g,
      })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Impossible d'analyser la photo.")
    } finally {
      setIsPreparing(false)
    }
  }

  if (configuredProviders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Configure une clé API IA dans ton{' '}
        <Link to="/profile" className="text-primary hover:underline">
          profil
        </Link>{' '}
        pour utiliser la photo d'étiquette.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {configuredProviders.length > 1 && (
        <div className="flex items-center gap-1 self-start rounded-lg border border-border p-0.5">
          {configuredProviders.map((provider) => (
            <Button
              key={provider}
              type="button"
              size="sm"
              variant={activeProvider === provider ? 'default' : 'ghost'}
              onClick={() => setSelectedProvider(provider)}
            >
              {AI_PROVIDER_LABELS[provider]}
            </Button>
          ))}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void handleFile(file)
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isPreparing}
        onClick={() => fileInputRef.current?.click()}
        className="self-start"
      >
        {isPreparing ? (
          <>
            <Loader2 className="animate-spin" /> Analyse en cours…
          </>
        ) : (
          <>
            <Camera /> Prendre en photo l'étiquette
          </>
        )}
      </Button>
      {notReadable && (
        <p className="text-sm text-muted-foreground">
          Étiquette illisible sur cette photo. Réessaie avec un meilleur cadrage, ou saisis les
          valeurs toi-même.
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
