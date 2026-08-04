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
  updateSessionTemplateExercise,
  type SessionTemplateExercise,
  type SessionTemplateExerciseInput,
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
  targetWeightKg: number | null
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

// Applying a proposal used to delete every existing slot and recreate them
// all from scratch — simple, but a slot's id is what session_log_sets
// history hangs off of, and deleting it cascade-destroys that history
// permanently (confirmed happening in production — see the archived_at
// migration). Matched slots are now updated in place instead, in two
// passes so the exercises this adaptation is actually *keeping* (the
// common case — e.g. "drop squat/hack squat, keep everything else" for a
// knee-pain adaptation) never lose their id at all:
//
//  1. Same exercise, still in the new proposal → update that slot's
//     targets in place, exact identity preserved.
//  2. Whatever's left over on both sides is paired off positionally —
//     even a genuine exercise swap keeps the old slot's row (and history)
//     alive rather than deleting-then-recreating a fresh id for it.
//     Only a real surplus (list shrank) or shortfall (list grew) ends up
//     actually deleted/created.
export async function applySessionAdaptation(
  sessionTemplateId: string,
  focus: ProgramFocus,
  existingSlots: SessionTemplateExercise[],
  proposal: SessionAdaptationProposal,
): Promise<void> {
  const restSeconds = DEFAULT_REST_SECONDS_BY_FOCUS[focus]
  const toInput = (exercise: ProgramProposalExercise): SessionTemplateExerciseInput => ({
    exercise_id: exercise.exerciseId,
    target_sets: exercise.targetSets,
    target_reps_min: exercise.targetRepsMin,
    target_reps_max: exercise.targetRepsMax,
    target_rpe: exercise.targetRpe,
    target_rest_seconds: restSeconds,
    target_weight_kg: exercise.targetWeightKg,
    notes: null,
    superset_group: null,
    is_unilateral: false,
    is_bodyweight: false,
  })

  const remainingSlots = [...existingSlots]
  const remainingProposals = [...proposal.exercises]

  for (const proposedExercise of [...remainingProposals]) {
    const matchIndex = remainingSlots.findIndex(
      (slot) => slot.exercise_id === proposedExercise.exerciseId,
    )
    if (matchIndex === -1) continue
    const slot = remainingSlots.splice(matchIndex, 1)[0]!
    remainingProposals.splice(remainingProposals.indexOf(proposedExercise), 1)
    await updateSessionTemplateExercise(slot.id, toInput(proposedExercise))
  }

  while (remainingSlots.length > 0 && remainingProposals.length > 0) {
    const slot = remainingSlots.shift()!
    const exercise = remainingProposals.shift()!
    await updateSessionTemplateExercise(slot.id, toInput(exercise))
  }
  for (const slot of remainingSlots) {
    await deleteSessionTemplateExercise(slot.id)
  }
  for (const exercise of remainingProposals) {
    await createSessionTemplateExercise(sessionTemplateId, toInput(exercise))
  }
}
