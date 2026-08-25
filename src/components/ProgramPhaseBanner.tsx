import type { ProgramPhaseInfo } from '@/hooks/useProgramPhase'
import type { ProgramFocus } from '@/lib/programs-api'

interface ProgramPhaseBannerProps {
  focus: ProgramFocus
  info: ProgramPhaseInfo
}

// Bandeau informatif, non destructif — scopé via AskUserQuestion : le RPE
// cible propre à chaque exercice (session_template_exercises.target_rpe)
// reste affiché et inchangé en base ailleurs sur cette page, l'utilisateur
// combine les deux lui-même plutôt que de perdre sa personnalisation par
// exercice. "Semaine N/6" n'a de sens que pour le bloc hypertrophie —
// deload reste un bloc homogène sans notion de semaine à l'intérieur.
export function ProgramPhaseBanner({ focus, info }: ProgramPhaseBannerProps) {
  const { week, phase } = info
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
      <span className="font-medium">
        {focus === 'hypertrophie' ? `Semaine ${week}/6 · ` : ''}
        {phase.label}
      </span>
      <span className="text-muted-foreground">
        {' '}
        · Vise RPE {phase.rpeMin}-{phase.rpeMax} ({phase.effortLabel})
      </span>
    </div>
  )
}
