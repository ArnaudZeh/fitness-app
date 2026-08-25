import { computeProgramCurrentWeek, getProgramPhase, type ProgramPhase } from '@/lib/program-phase'
import { useSessionLogs } from '@/hooks/useSessionLogs'
import { useSessionTemplates } from '@/hooks/useSessionTemplates'
import type { ProgramFocus } from '@/lib/programs-api'

export interface ProgramPhaseInfo {
  week: number
  phase: ProgramPhase
}

// Semaine + phase courantes d'un programme (hypertrophie/deload
// uniquement, voir program-phase.ts) — dérivées des séances réellement
// complétées (useSessionLogs, déjà offline-first), pas d'une date de
// début : un programme n'a jamais de champ dédié pour ça, la semaine se
// déduit directement de l'historique de complétion de chaque jour
// d'entraînement.
export function useProgramPhase(
  programId: string,
  focus: ProgramFocus,
): ProgramPhaseInfo | null {
  const templates = useSessionTemplates(programId)
  const logs = useSessionLogs(programId)

  if (!templates.data || !logs) return null

  const trainingTemplateIds = templates.data
    .filter((t) => t.day_type === 'training')
    .map((t) => t.id)

  const completedCountByTemplateId = new Map<string, number>()
  for (const log of logs) {
    if (log.status !== 'completed') continue
    completedCountByTemplateId.set(
      log.session_template_id,
      (completedCountByTemplateId.get(log.session_template_id) ?? 0) + 1,
    )
  }

  const week = computeProgramCurrentWeek(trainingTemplateIds, completedCountByTemplateId)
  const phase = getProgramPhase(focus, week)
  return phase ? { week, phase } : null
}
