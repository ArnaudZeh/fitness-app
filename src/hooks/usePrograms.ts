import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/programs-api'
import type { Block, BlockInput, Program, ProgramInput } from '@/lib/programs-api'

const programsKey = ['programs'] as const
const programKey = (id: string) => ['programs', id] as const
const blocksKey = (programId: string) => ['programs', programId, 'blocks'] as const

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: programsKey }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: programsKey }),
  })
}

export function useDuplicateProgram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (program: Program) => api.duplicateProgram(program),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: programsKey }),
  })
}

export function useBlock(id: string) {
  return useQuery({
    queryKey: ['blocks', id] as const,
    queryFn: () => api.fetchBlock(id),
  })
}

export function useBlocks(programId: string) {
  return useQuery({
    queryKey: blocksKey(programId),
    queryFn: () => api.fetchBlocks(programId),
  })
}

export function useCreateBlock(programId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BlockInput) => api.createBlock(programId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blocksKey(programId) }),
  })
}

export function useUpdateBlock(programId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BlockInput> }) =>
      api.updateBlock(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blocksKey(programId) }),
  })
}

export function useDeleteBlock(programId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteBlock(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blocksKey(programId) }),
  })
}

export function useSwapBlockOrder(programId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ a, b }: { a: Block; b: Block }) => api.swapBlockOrder(a, b),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blocksKey(programId) }),
  })
}
