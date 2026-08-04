import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applySessionAdaptation } from '@/lib/session-adaptation-api'
import type { SessionAdaptationProposal } from '@/lib/session-adaptation-api'
import type { SessionTemplateExercise } from '@/lib/sessions-api'
import type { ProgramProposalExercise } from '@/lib/program-generation-api'

const { updateSessionTemplateExercise, deleteSessionTemplateExercise, createSessionTemplateExercise } =
  vi.hoisted(() => ({
    updateSessionTemplateExercise: vi.fn(),
    deleteSessionTemplateExercise: vi.fn(),
    createSessionTemplateExercise: vi.fn(),
  }))

vi.mock('@/lib/sessions-api', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/sessions-api')>('@/lib/sessions-api')
  return {
    ...actual,
    updateSessionTemplateExercise,
    deleteSessionTemplateExercise,
    createSessionTemplateExercise,
  }
})

function makeSlot(overrides: Partial<SessionTemplateExercise> = {}): SessionTemplateExercise {
  return {
    id: 'slot-1',
    user_id: 'user-1',
    session_template_id: 'template-1',
    exercise_id: 'ex-squat',
    order_index: 0,
    target_sets: 3,
    target_reps_min: 6,
    target_reps_max: 8,
    target_rpe: null,
    target_rest_seconds: null,
    target_weight_kg: null,
    notes: null,
    superset_group: null,
    is_unilateral: false,
    is_bodyweight: false,
    archived_at: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    exercise: { id: 'ex-squat', name: 'Squat', muscle_group: 'jambes', image_url: null },
    ...overrides,
  }
}

function makeProposedExercise(
  overrides: Partial<ProgramProposalExercise> = {},
): ProgramProposalExercise {
  return {
    exerciseId: 'ex-squat',
    exerciseName: 'Squat',
    targetSets: 3,
    targetRepsMin: 6,
    targetRepsMax: 8,
    targetRpe: null,
    targetWeightKg: null,
    ...overrides,
  }
}

function makeProposal(exercises: ProgramProposalExercise[]): SessionAdaptationProposal {
  return { rationale: 'test', exercises }
}

describe('applySessionAdaptation', () => {
  beforeEach(() => {
    updateSessionTemplateExercise.mockReset().mockResolvedValue(undefined)
    deleteSessionTemplateExercise.mockReset().mockResolvedValue(undefined)
    createSessionTemplateExercise.mockReset().mockResolvedValue(undefined)
  })

  it('updates a slot in place when its exercise is unchanged, never deleting it', async () => {
    const slot = makeSlot({ id: 'slot-squat', exercise_id: 'ex-squat' })
    const proposal = makeProposal([
      makeProposedExercise({ exerciseId: 'ex-squat', targetSets: 5 }),
    ])

    await applySessionAdaptation('template-1', 'force', [slot], proposal)

    expect(updateSessionTemplateExercise).toHaveBeenCalledTimes(1)
    expect(updateSessionTemplateExercise).toHaveBeenCalledWith(
      'slot-squat',
      expect.objectContaining({ exercise_id: 'ex-squat', target_sets: 5 }),
    )
    expect(deleteSessionTemplateExercise).not.toHaveBeenCalled()
    expect(createSessionTemplateExercise).not.toHaveBeenCalled()
  })

  it('preserves an unchanged exercise even when the list also swaps another one out', async () => {
    // The knee-pain scenario: keep bench press, replace squat with leg press.
    const benchSlot = makeSlot({ id: 'slot-bench', exercise_id: 'ex-bench' })
    const squatSlot = makeSlot({ id: 'slot-squat', exercise_id: 'ex-squat' })
    const proposal = makeProposal([
      makeProposedExercise({ exerciseId: 'ex-leg-press' }),
      makeProposedExercise({ exerciseId: 'ex-bench' }),
    ])

    await applySessionAdaptation('template-1', 'force', [squatSlot, benchSlot], proposal)

    // Bench matched exactly → updated in place, identity preserved.
    expect(updateSessionTemplateExercise).toHaveBeenCalledWith(
      'slot-bench',
      expect.objectContaining({ exercise_id: 'ex-bench' }),
    )
    // Squat has no match left → its row is repurposed for leg press instead
    // of being deleted, since one slot is genuinely being swapped for another.
    expect(updateSessionTemplateExercise).toHaveBeenCalledWith(
      'slot-squat',
      expect.objectContaining({ exercise_id: 'ex-leg-press' }),
    )
    expect(updateSessionTemplateExercise).toHaveBeenCalledTimes(2)
    expect(deleteSessionTemplateExercise).not.toHaveBeenCalled()
    expect(createSessionTemplateExercise).not.toHaveBeenCalled()
  })

  it('deletes a genuine surplus slot when the new list is shorter', async () => {
    const slotA = makeSlot({ id: 'slot-a', exercise_id: 'ex-a' })
    const slotB = makeSlot({ id: 'slot-b', exercise_id: 'ex-b' })
    const proposal = makeProposal([makeProposedExercise({ exerciseId: 'ex-a' })])

    await applySessionAdaptation('template-1', 'force', [slotA, slotB], proposal)

    expect(updateSessionTemplateExercise).toHaveBeenCalledWith(
      'slot-a',
      expect.objectContaining({ exercise_id: 'ex-a' }),
    )
    expect(deleteSessionTemplateExercise).toHaveBeenCalledExactlyOnceWith('slot-b')
    expect(createSessionTemplateExercise).not.toHaveBeenCalled()
  })

  it('creates a new slot when the new list is longer', async () => {
    const slotA = makeSlot({ id: 'slot-a', exercise_id: 'ex-a' })
    const proposal = makeProposal([
      makeProposedExercise({ exerciseId: 'ex-a' }),
      makeProposedExercise({ exerciseId: 'ex-b' }),
    ])

    await applySessionAdaptation('template-1', 'force', [slotA], proposal)

    expect(updateSessionTemplateExercise).toHaveBeenCalledWith(
      'slot-a',
      expect.objectContaining({ exercise_id: 'ex-a' }),
    )
    expect(createSessionTemplateExercise).toHaveBeenCalledExactlyOnceWith(
      'template-1',
      expect.objectContaining({ exercise_id: 'ex-b' }),
    )
    expect(deleteSessionTemplateExercise).not.toHaveBeenCalled()
  })
})
