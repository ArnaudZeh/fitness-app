import { updateNutritionTargets } from '@/lib/nutrition-targets-api'

export interface NutritionAdjustmentProposal {
  rationale: string
  caloriesTarget: number
  proteinGTarget: number
  carbsGTarget: number
  fatGTarget: number
}

// Mirrors applySessionAdaptation/applyProgramProposal: reuses the exact
// existing write function (updateNutritionTargets, same one
// NutritionTargetsCard's manual-edit form calls), no bespoke write path for
// AI output.
export async function applyNutritionAdjustment(proposal: NutritionAdjustmentProposal): Promise<void> {
  await updateNutritionTargets({
    calories_target: proposal.caloriesTarget,
    protein_g_target: proposal.proteinGTarget,
    carbs_g_target: proposal.carbsGTarget,
    fat_g_target: proposal.fatGTarget,
  })
}
