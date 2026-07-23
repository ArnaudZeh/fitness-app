import { invokeEdgeFunction } from '@/lib/edge-function'
import type { AiProvider } from '@/lib/ai-keys-api'
import type { TrendSummary } from '@/lib/analytics'
import type { UserProfileContext } from '@/lib/user-context'

export async function analyzeTrends(
  provider: AiProvider,
  summary: TrendSummary,
  profileContext: UserProfileContext,
): Promise<string> {
  const { analysis } = await invokeEdgeFunction<{ analysis: string }>('ai-analyze-trends', {
    provider,
    summary,
    profileContext,
  })
  return analysis
}
