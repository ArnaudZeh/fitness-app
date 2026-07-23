import { useMutation } from '@tanstack/react-query'
import { analyzeTrends } from '@/lib/ai-analysis-api'
import type { AiProvider } from '@/lib/ai-keys-api'
import type { TrendSummary } from '@/lib/analytics'
import type { UserProfileContext } from '@/lib/user-context'

// On-demand only, never auto-run — see the Edge Function's own comment.
// No query invalidation on success: this isn't data that other parts of
// the app read, just a result shown once in the card that triggered it.
export function useAnalyzeTrends() {
  return useMutation({
    mutationFn: ({
      provider,
      summary,
      profileContext,
    }: {
      provider: AiProvider
      summary: TrendSummary
      profileContext: UserProfileContext
    }) => analyzeTrends(provider, summary, profileContext),
  })
}
