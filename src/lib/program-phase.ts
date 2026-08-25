import type { ProgramFocus } from '@/lib/programs-api'

// Semaine courante d'un programme, calculée sur les séances réellement
// complétées (pas le calendrier) — scopé via AskUserQuestion : un départ
// d'une semaine (voyage, imprévu) ne doit pas faire avancer le compteur
// tout seul. Chaque jour d'entraînement (session_template) a son propre
// nombre de complétions ; la semaine du programme est le nombre de
// complétions du jour le MOINS avancé + 1 — tant que tous les jours de la
// semaine n'ont pas atteint leur Nème complétion, le programme reste
// considéré en semaine N (pas N+1), ce qui absorbe naturellement un jour
// loupé sans avoir besoin de le "rattraper" explicitement.
export function computeProgramCurrentWeek(
  trainingTemplateIds: string[],
  completedCountByTemplateId: Map<string, number>,
): number {
  if (trainingTemplateIds.length === 0) return 1
  const minCompletions = Math.min(
    ...trainingTemplateIds.map((id) => completedCountByTemplateId.get(id) ?? 0),
  )
  return minCompletions + 1
}

export interface ProgramPhase {
  label: string
  rpeMin: number
  rpeMax: number
  effortLabel: string
}

// Bloc hypertrophie de 6 semaines en 3 phases, chiffres donnés directement
// par le user pour son usage réel de périodisation (pas une formule
// théorique). Au-delà de la semaine 6 (retard, pas encore dupliqué vers le
// prochain bloc), reste bloqué sur Peak/Overreach indéfiniment plutôt que
// d'inventer une zone au-delà — pousse implicitement vers la duplication
// du prochain bloc plutôt que de rester en surrégime trop longtemps.
const HYPERTROPHIE_PHASES: { maxWeek: number; phase: ProgramPhase }[] = [
  {
    maxWeek: 2,
    phase: { label: 'Acclimatation', rpeMin: 7, rpeMax: 8, effortLabel: '2-3 reps en réserve' },
  },
  {
    maxWeek: 4,
    phase: { label: 'Surcharge', rpeMin: 8, rpeMax: 9, effortLabel: '1 rep en réserve' },
  },
  {
    maxWeek: Infinity,
    phase: {
      label: 'Peak — Overreach',
      rpeMin: 9,
      rpeMax: 10,
      effortLabel: "jusqu'à l'échec",
    },
  },
]

// Deload : fourchette fixe sur toute sa durée, pas de progression interne
// — cohérent avec le fait qu'un deload est déjà traité comme un bloc
// homogène partout ailleurs dans l'app (pas de notion de semaine à
// l'intérieur d'un deload).
const DELOAD_PHASE: ProgramPhase = {
  label: 'Deload',
  rpeMin: 5,
  rpeMax: 6,
  effortLabel: 'récupération active',
}

// null pour force/endurance — pas de système de phases pour ces focus
// pour l'instant, seulement demandé pour hypertrophie (+ deload, qui a
// toujours été une réduction ponctuelle plutôt qu'une zone propre).
export function getProgramPhase(focus: ProgramFocus, week: number): ProgramPhase | null {
  if (focus === 'deload') return DELOAD_PHASE
  if (focus !== 'hypertrophie') return null
  // The last bracket's maxWeek is Infinity, so .find() always matches for
  // any real week number — the non-null assertion just satisfies the type
  // checker, which can't see that guarantee from the loop alone.
  const bracket = HYPERTROPHIE_PHASES.find((entry) => week <= entry.maxWeek)!
  return bracket.phase
}
