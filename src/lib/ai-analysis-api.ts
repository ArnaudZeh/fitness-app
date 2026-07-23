import { invokeEdgeFunction } from '@/lib/edge-function'
import type { AiProvider } from '@/lib/ai-keys-api'
import type { TrendSummary } from '@/lib/analytics'

export async function analyzeTrends(
  provider: AiProvider,
  summary: TrendSummary,
): Promise<string> {
  const { analysis } = await invokeEdgeFunction<{ analysis: string }>('ai-analyze-trends', {
    provider,
    summary,
  })
  return analysis
}
