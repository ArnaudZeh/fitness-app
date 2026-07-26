import { invokeEdgeFunction } from '@/lib/edge-function'
import type { AiProvider } from '@/lib/ai-keys-api'
import type { UserProfileContext } from '@/lib/user-context'
import type { TrendSummary } from '@/lib/analytics'
import type { AvailableExercise, ProgramProposalExercise } from '@/lib/program-generation-api'
import type { ProgramFocus } from '@/lib/programs-api'
import {
  createSessionTemplateExercise,
  DEFAULT_REST_SECONDS_BY_FOCUS,
  deleteSessionTemplateExercise,
  type SessionTemplateExercise,
} from '@/lib/sessions-api'

export interface SessionAdaptationProposal {
  rationale: string
  exercises: ProgramProposalExercise[]
}

export interface CurrentExercise {
  exerciseId: string
  exerciseName: string
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  targetRpe: number | null
}

export interface AdaptSessionParams {
  provider: AiProvider
  profileContext: UserProfileContext
  trendSummary: TrendSummary
  currentExercises: CurrentExercise[]
  availableExercises: AvailableExercise[]
  dayContext: string
}

export async function generateSessionAdaptation(
  params: AdaptSessionParams,
): Promise<SessionAdaptationProposal> {
  const { proposal } = await invokeEdgeFunction<{ proposal: SessionAdaptationProposal }>(
    'ai-adapt-session',
    {
      provider: params.provider,
      profileContext: params.profileContext,
      trendSummary: params.trendSummary,
      currentExercises: params.currentExercises,
      availableExercises: params.availableExercises,
      dayContext: params.dayContext,
    },
  )
  return proposal
}

// Mirrors applyProgramProposal()'s pattern (never a bespoke write path for
// AI output): remove the day's existing exercise slots, then recreate them
// from the proposal via the exact same functions the manual "add/edit
// exercise" dialog uses. Rest seconds still comes from
// DEFAULT_REST_SECONDS_BY_FOCUS, never the model.
export async function applySessionAdaptation(
  sessionTemplateId: string,
  focus: ProgramFocus,
  existingSlots: SessionTemplateExercise[],
  proposal: SessionAdaptationProposal,
): Promise<void> {
  for (const slot of existingSlots) {
    await deleteSessionTemplateExercise(slot.id)
  }

  const restSeconds = DEFAULT_REST_SECONDS_BY_FOCUS[focus]
  for (const exercise of proposal.exercises) {
    await createSessionTemplateExercise(sessionTemplateId, {
      exercise_id: exercise.exerciseId,
      target_sets: exercise.targetSets,
      target_reps_min: exercise.targetRepsMin,
      target_reps_max: exercise.targetRepsMax,
      target_rpe: exercise.targetRpe,
      target_rest_seconds: restSeconds,
      notes: null,
      superset_group: null,
      is_unilateral: false,
    })
  }
}
