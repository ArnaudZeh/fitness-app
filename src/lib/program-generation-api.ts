import { invokeEdgeFunction } from '@/lib/edge-function'
import type { AiProvider } from '@/lib/ai-keys-api'
import type { UserProfileContext } from '@/lib/user-context'
import { createProgram, type Program, type ProgramFocus } from '@/lib/programs-api'
import {
  createSessionTemplateExercise,
  DEFAULT_REST_SECONDS_BY_FOCUS,
  fetchSessionTemplates,
  updateSessionTemplateDayType,
} from '@/lib/sessions-api'

export interface ProgramProposalExercise {
  exerciseId: string
  exerciseName: string
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  targetRpe: number | null
}

export interface ProgramProposalDay {
  dayOfWeek: number
  dayType: 'training' | 'rest'
  exercises: ProgramProposalExercise[]
}

export interface ProgramProposal {
  programName: string
  focus: ProgramFocus
  rationale: string
  days: ProgramProposalDay[]
}

export interface AvailableExercise {
  id: string
  name: string
  muscleGroup: string | null
}

export interface GenerateProgramParams {
  provider: AiProvider
  profileContext: UserProfileContext
  availableExercises: AvailableExercise[]
  daysPerWeek: number
  equipment: string
  constraints: string
}

export async function generateProgram(params: GenerateProgramParams): Promise<ProgramProposal> {
  const { proposal } = await invokeEdgeFunction<{ proposal: ProgramProposal }>(
    'ai-generate-program',
    {
      provider: params.provider,
      profileContext: params.profileContext,
      availableExercises: params.availableExercises,
      daysPerWeek: params.daysPerWeek,
      equipment: params.equipment,
      constraints: params.constraints,
    },
  )
  return proposal
}

// Mirrors duplicateProgram()'s pattern: create the program, then match each
// of its auto-created 7 session_templates by day_of_week and fill in the
// proposed day_type + exercises — the AI proposal never gets a bespoke write
// path, it flows through the exact same functions the manual "build a
// program" screens use.
export async function applyProgramProposal(proposal: ProgramProposal): Promise<Program> {
  const program = await createProgram({
    name: proposal.programName,
    description: proposal.rationale,
    focus: proposal.focus,
  })

  const templates = await fetchSessionTemplates(program.id)
  const templateByDay = new Map(templates.map((template) => [template.day_of_week, template]))
  const restSeconds = DEFAULT_REST_SECONDS_BY_FOCUS[proposal.focus]

  for (const day of proposal.days) {
    if (day.dayType !== 'training') continue
    const template = templateByDay.get(day.dayOfWeek)
    if (!template) continue

    await updateSessionTemplateDayType(template.id, 'training')

    for (const exercise of day.exercises) {
      await createSessionTemplateExercise(template.id, {
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

  return program
}
