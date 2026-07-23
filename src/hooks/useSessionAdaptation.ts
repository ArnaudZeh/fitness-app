import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/session-adaptation-api'
import { exercisesKey } from '@/hooks/useSessionTemplates'
import type { SessionTemplateExercise } from '@/lib/sessions-api'
import type { ProgramFocus } from '@/lib/programs-api'

// No invalidation on generation — it's a proposal, not a write. Applying it
// is what actually changes data.
export function useGenerateSessionAdaptation() {
  return useMutation({
    mutationFn: (params: api.AdaptSessionParams) => api.generateSessionAdaptation(params),
  })
}

export function useApplySessionAdaptation(sessionTemplateId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      focus,
      existingSlots,
      proposal,
    }: {
      focus: ProgramFocus
      existingSlots: SessionTemplateExercise[]
      proposal: api.SessionAdaptationProposal
    }) => api.applySessionAdaptation(sessionTemplateId, focus, existingSlots, proposal),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: exercisesKey(sessionTemplateId) }),
  })
}
