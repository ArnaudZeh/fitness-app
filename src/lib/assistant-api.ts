import { supabase } from '@/lib/supabase'
import { invokeEdgeFunction } from '@/lib/edge-function'
import type { Database } from '@/lib/database.types'
import type { AiProvider } from '@/lib/ai-keys-api'
import type { UserProfileContext } from '@/lib/user-context'
import type { TrendSummary } from '@/lib/analytics'
import type { AvailableExercise, ProgramProposal } from '@/lib/program-generation-api'
import { applyProgramProposal } from '@/lib/program-generation-api'
import type { SessionAdaptationProposal } from '@/lib/session-adaptation-api'
import { applySessionAdaptation } from '@/lib/session-adaptation-api'
import type { ProgramFocus } from '@/lib/programs-api'
import { fetchSessionTemplateExercises } from '@/lib/sessions-api'
import type { CurrentExercise } from '@/lib/session-adaptation-api'
import type { NutritionAdjustmentProposal } from '@/lib/nutrition-adjustment-api'
import { applyNutritionAdjustment } from '@/lib/nutrition-adjustment-api'

export type AssistantRole = 'user' | 'assistant'
export type AssistantToolName = 'generer_programme' | 'adapter_seance' | 'ajuster_objectifs_nutrition'

export type AssistantProposal =
  | { type: 'generer_programme'; proposal: ProgramProposal }
  | {
      type: 'adapter_seance'
      sessionTemplateId: string
      focus: ProgramFocus
      proposal: SessionAdaptationProposal
    }
  | { type: 'ajuster_objectifs_nutrition'; proposal: NutritionAdjustmentProposal }

export interface AssistantMessage {
  id: string
  role: AssistantRole
  content: string
  toolName: AssistantToolName | null
  toolProposal: AssistantProposal | null
  appliedAt: string | null
  createdAt: string
}

export interface ProgramDaySnapshot {
  dayOfWeek: number
  dayType: 'training' | 'rest'
  sessionTemplateId: string
  focus: ProgramFocus
  exercises: CurrentExercise[]
}

type AssistantMessageRow = Database['public']['Tables']['assistant_messages']['Row']

function toAssistantMessage(row: AssistantMessageRow): AssistantMessage {
  return {
    id: row.id,
    role: row.role as AssistantRole,
    content: row.content,
    toolName: row.tool_name as AssistantToolName | null,
    toolProposal: row.tool_proposal as unknown as AssistantProposal | null,
    appliedAt: row.applied_at,
    createdAt: row.created_at,
  }
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchAssistantMessages(): Promise<AssistantMessage[]> {
  const { data, error } = await supabase
    .from('assistant_messages')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map(toAssistantMessage)
}

async function insertUserMessage(content: string): Promise<AssistantMessage> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('assistant_messages')
    .insert({ user_id: userId, role: 'user', content })
    .select()
    .single()
  if (error) throw error
  return toAssistantMessage(data)
}

async function insertAssistantMessage(
  content: string,
  proposal: AssistantProposal | null,
): Promise<AssistantMessage> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('assistant_messages')
    .insert({
      user_id: userId,
      role: 'assistant',
      content,
      tool_name: proposal?.type ?? null,
      tool_proposal: proposal as unknown as Database['public']['Tables']['assistant_messages']['Insert']['tool_proposal'],
    })
    .select()
    .single()
  if (error) throw error
  return toAssistantMessage(data)
}

export async function clearAssistantConversation(): Promise<void> {
  const userId = await requireUserId()
  const { error } = await supabase.from('assistant_messages').delete().eq('user_id', userId)
  if (error) throw error
}

// One join query for the whole active program (all 7 days + their current
// exercises) rather than a hook-per-day loop — the chat needs the full
// week's structure up front so adapter_seance can resolve "mardi" to a
// concrete session_template_id and its current exercises server-side.
export async function fetchActiveProgramSnapshot(): Promise<ProgramDaySnapshot[]> {
  const userId = await requireUserId()
  // Explicit filter, not just RLS: the friend-profile feature widened the
  // SELECT policy to also allow reading a friend's active program, so
  // relying on RLS alone here would let the coach read (and act on) a
  // friend's program instead of the caller's own.
  const { data: activePrograms, error: programsError } = await supabase
    .from('programs')
    .select('id, focus')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
  if (programsError) throw programsError
  const activeProgram = activePrograms[0]
  if (!activeProgram) return []

  const { data: templates, error: templatesError } = await supabase
    .from('session_templates')
    .select(
      `id, day_of_week, day_type,
       session_template_exercises (
         exercise_id, target_sets, target_reps_min, target_reps_max, target_rpe,
         target_weight_kg,
         exercise:exercises ( name )
       )`,
    )
    .eq('program_id', activeProgram.id)
    .is('session_template_exercises.archived_at', null)
    .order('day_of_week', { ascending: true })
  if (templatesError) throw templatesError

  const focus = activeProgram.focus as ProgramFocus
  return (templates ?? []).map((template) => ({
    dayOfWeek: template.day_of_week,
    dayType: template.day_type as 'training' | 'rest',
    sessionTemplateId: template.id,
    focus,
    exercises: (template.session_template_exercises ?? []).map((slot) => ({
      exerciseId: slot.exercise_id,
      exerciseName: slot.exercise?.name ?? '',
      targetSets: slot.target_sets,
      targetRepsMin: slot.target_reps_min,
      targetRepsMax: slot.target_reps_max,
      targetRpe: slot.target_rpe,
      targetWeightKg: slot.target_weight_kg,
    })),
  }))
}

export interface TodayContext {
  isoDate: string
  dayOfWeek: number
}

export interface SendAssistantMessageParams {
  provider: AiProvider
  message: string
  conversationHistory: { role: AssistantRole; content: string }[]
  profileContext: UserProfileContext
  trendSummary: TrendSummary
  programStructure: ProgramDaySnapshot[]
  availableExercises: AvailableExercise[]
  today: TodayContext
}

// Orchestrates the full round-trip: persist the user's message, call the
// coach (which may run one tool internally — see ai-coach-chat.ts), persist
// the assistant's reply (with its proposal, if any) so a reload replays the
// same conversation instead of losing it.
export async function sendAssistantMessage(
  params: SendAssistantMessageParams,
): Promise<{ userMessage: AssistantMessage; assistantMessage: AssistantMessage }> {
  const userMessage = await insertUserMessage(params.message)
  const result = await invokeEdgeFunction<{ message: string; proposal: AssistantProposal | null }>(
    'ai-coach-chat',
    {
      provider: params.provider,
      message: params.message,
      conversationHistory: params.conversationHistory,
      profileContext: params.profileContext,
      trendSummary: params.trendSummary,
      programStructure: params.programStructure,
      availableExercises: params.availableExercises,
      today: params.today,
    },
  )
  const assistantMessage = await insertAssistantMessage(result.message, result.proposal)
  return { userMessage, assistantMessage }
}

// Mirrors the standalone dialogs' apply step exactly (same
// applyProgramProposal/applySessionAdaptation, same review-before-write
// principle) — re-fetches the target session's current exercises fresh
// rather than trusting whatever was true when the proposal was generated,
// since other messages/edits may have happened since.
export async function applyAssistantProposal(message: AssistantMessage): Promise<void> {
  const proposal = message.toolProposal
  if (!proposal) throw new Error('Aucune proposition à appliquer.')

  if (proposal.type === 'generer_programme') {
    await applyProgramProposal(proposal.proposal)
  } else if (proposal.type === 'ajuster_objectifs_nutrition') {
    await applyNutritionAdjustment(proposal.proposal)
  } else {
    const existingSlots = await fetchSessionTemplateExercises(proposal.sessionTemplateId)
    await applySessionAdaptation(
      proposal.sessionTemplateId,
      proposal.focus,
      existingSlots,
      proposal.proposal,
    )
  }

  const { error } = await supabase
    .from('assistant_messages')
    .update({ applied_at: new Date().toISOString() })
    .eq('id', message.id)
  if (error) throw error
}
