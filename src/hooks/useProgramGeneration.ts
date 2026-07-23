import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/program-generation-api'

// No query invalidation on generation — it's a proposal, not a write. The
// apply step below is what actually creates data, so that's what
// invalidates the programs list.
export function useGenerateProgram() {
  return useMutation({
    mutationFn: (params: api.GenerateProgramParams) => api.generateProgram(params),
  })
}

export function useApplyProgramProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (proposal: api.ProgramProposal) => api.applyProgramProposal(proposal),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['programs'] }),
  })
}
