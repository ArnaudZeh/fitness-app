import { invokeEdgeFunction } from '@/lib/edge-function'
import type { AiProvider } from '@/lib/ai-keys-api'

export interface NutritionLabelExtraction {
  extracted: boolean
  name: string | null
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
}

// imageBase64 is the raw base64 payload, no "data:image/...;base64," prefix
// — stripped client-side so this matches exactly what the Edge Function
// forwards to each provider (each provider call site adds its own wrapping).
export async function analyzeNutritionLabel(
  provider: AiProvider,
  imageBase64: string,
): Promise<NutritionLabelExtraction> {
  const { extraction } = await invokeEdgeFunction<{ extraction: NutritionLabelExtraction }>(
    'ai-analyze-nutrition-label',
    { provider, imageBase64 },
  )
  return extraction
}
