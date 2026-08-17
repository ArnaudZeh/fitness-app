import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/programs-api'
import type { CopyProgramOptions, Program, ProgramInput } from '@/lib/programs-api'

const programsKey = ['programs'] as const
const programKey = (id: string) => ['programs', id] as const

export function usePrograms() {
  return useQuery({ queryKey: programsKey, queryFn: api.fetchPrograms })
}

export function useProgram(id: string) {
  return useQuery({ queryKey: programKey(id), queryFn: () => api.fetchProgram(id) })
}

export function useCreateProgram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProgramInput) => api.createProgram(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: programsKey }),
  })
}

export function useUpdateProgram(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<ProgramInput & { status: Program['status'] }>) =>
      api.updateProgram(id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(programKey(id), updated)
      void queryClient.invalidateQueries({ queryKey: programsKey })
    },
  })
}

export function useDeleteProgram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteProgram(id),
    // void, not returned: mutateAsync() awaits onSuccess's return value, and
    // an un-voided invalidateQueries() here would make deletion's completion
    // depend on the background refetch of whatever else is active — including
    // the just-deleted program's own detail query if it's still mounted,
    // which errors and retries with backoff, stalling the delete button.
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: programsKey }),
  })
}

export function useDuplicateProgram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      program,
      newName,
      options,
    }: {
      program: Program
      newName: string
      options?: CopyProgramOptions
    }) => api.duplicateProgram(program, newName, options),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: programsKey }),
  })
}

export function useCopyProgramToMyAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ programId, sourceLabel }: { programId: string; sourceLabel: string }) =>
      api.copyProgramToMyAccount(programId, sourceLabel),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: programsKey }),
  })
}
