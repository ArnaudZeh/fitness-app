import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type ProgramStatus = 'draft' | 'active' | 'archived'
export type BlockFocus = 'force' | 'hypertrophie' | 'endurance'
export type BlockType = 'accumulation' | 'intensification' | 'realisation' | 'deload'

type ProgramRow = Database['public']['Tables']['programs']['Row']
type BlockRow = Database['public']['Tables']['blocks']['Row']

// Postgres CHECK constraints guarantee these columns only ever hold the
// literal values below — narrower than the generated `string` column type.
function toProgram(row: ProgramRow): Program {
  return { ...row, status: row.status as ProgramStatus }
}
function toBlock(row: BlockRow): Block {
  return {
    ...row,
    focus: row.focus as BlockFocus,
    block_type: row.block_type as BlockType,
  }
}

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  archived: 'Archivé',
}

export const BLOCK_FOCUS_LABELS: Record<BlockFocus, string> = {
  force: 'Force',
  hypertrophie: 'Hypertrophie',
  endurance: 'Endurance',
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  accumulation: 'Accumulation',
  intensification: 'Intensification',
  realisation: 'Réalisation',
  deload: 'Deload',
}

export interface Program extends Omit<ProgramRow, 'status'> {
  status: ProgramStatus
}

export interface Block extends Omit<BlockRow, 'focus' | 'block_type'> {
  focus: BlockFocus
  block_type: BlockType
}

export interface ProgramInput {
  name: string
  description: string | null
}

export interface BlockInput {
  name: string
  focus: BlockFocus
  block_type: BlockType
  duration_weeks: number
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchPrograms(): Promise<Program[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toProgram)
}

export async function fetchProgram(id: string): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return toProgram(data)
}

export async function createProgram(input: ProgramInput): Promise<Program> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('programs')
    .insert({ ...input, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return toProgram(data)
}

export async function updateProgram(
  id: string,
  patch: Partial<ProgramInput & { status: ProgramStatus }>,
): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toProgram(data)
}

export async function deleteProgram(id: string): Promise<void> {
  const { error } = await supabase.from('programs').delete().eq('id', id)
  if (error) throw error
}

export async function duplicateProgram(program: Program): Promise<Program> {
  const userId = await requireUserId()
  const { data: newProgram, error: programError } = await supabase
    .from('programs')
    .insert({
      user_id: userId,
      name: program.name,
      description: program.description,
      version: program.version + 1,
      forked_from: program.id,
    })
    .select()
    .single()
  if (programError) throw programError
  const createdProgram = toProgram(newProgram)

  const blocks = await fetchBlocks(program.id)
  if (blocks.length > 0) {
    const { error: blocksError } = await supabase.from('blocks').insert(
      blocks.map((block) => ({
        user_id: userId,
        program_id: createdProgram.id,
        name: block.name,
        focus: block.focus,
        block_type: block.block_type,
        order_index: block.order_index,
        duration_weeks: block.duration_weeks,
      })),
    )
    if (blocksError) throw blocksError
  }

  return createdProgram
}

export async function fetchBlocks(programId: string): Promise<Block[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .eq('program_id', programId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data.map(toBlock)
}

export async function createBlock(programId: string, input: BlockInput): Promise<Block> {
  const userId = await requireUserId()
  const existing = await fetchBlocks(programId)
  const nextOrderIndex =
    existing.length === 0 ? 0 : Math.max(...existing.map((b) => b.order_index)) + 1

  const { data, error } = await supabase
    .from('blocks')
    .insert({
      ...input,
      user_id: userId,
      program_id: programId,
      order_index: nextOrderIndex,
    })
    .select()
    .single()
  if (error) throw error
  return toBlock(data)
}

export async function updateBlock(
  id: string,
  patch: Partial<BlockInput>,
): Promise<Block> {
  const { data, error } = await supabase
    .from('blocks')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toBlock(data)
}

export async function deleteBlock(id: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('id', id)
  if (error) throw error
}

// Pure so it can be unit-tested without a live Supabase call — boundary
// conditions (first/last/only block) are easy to get wrong here.
export function getSwapPair(
  blocks: Block[],
  blockId: string,
  direction: 'up' | 'down',
): [Block, Block] | null {
  const index = blocks.findIndex((b) => b.id === blockId)
  if (index === -1) return null
  const neighborIndex = direction === 'up' ? index - 1 : index + 1
  const neighbor = blocks[neighborIndex]
  const block = blocks[index]
  if (!neighbor || !block) return null
  return [block, neighbor]
}

export async function swapBlockOrder(a: Block, b: Block): Promise<void> {
  const { error: errorA } = await supabase
    .from('blocks')
    .update({ order_index: b.order_index })
    .eq('id', a.id)
  if (errorA) throw errorA

  const { error: errorB } = await supabase
    .from('blocks')
    .update({ order_index: a.order_index })
    .eq('id', b.id)
  if (errorB) throw errorB
}
