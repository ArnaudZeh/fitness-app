import { useMutation } from '@tanstack/react-query'
import { analyzeNutritionLabel } from '@/lib/nutrition-label-api'
import type { AiProvider } from '@/lib/ai-keys-api'

// On-demand only, triggered by taking/picking a photo — BYOK means each
// call spends the user's own provider quota, same discipline as every
// other AI feature hook (useAnalyzeTrends, etc.).
export function useAnalyzeNutritionLabel() {
  return useMutation({
    mutationFn: ({ provider, imageBase64 }: { provider: AiProvider; imageBase64: string }) =>
      analyzeNutritionLabel(provider, imageBase64),
  })
}
