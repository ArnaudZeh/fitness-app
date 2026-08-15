import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown } from 'lucide-react'
import { MacroProgressBar } from '@/components/MacroProgressBar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateNutritionTargets } from '@/hooks/useNutritionTargets'
import {
  caloriesFromMacros,
  computeAge,
  computeNutritionTargets,
  DAILY_ACTIVITY_LEVEL_LABELS,
  DAILY_ACTIVITY_MULTIPLIERS,
  dailyActivityMultiplierFromSteps,
  type DailyActivityLevel,
} from '@/lib/nutrition-calc'
import type { NutritionTargets } from '@/lib/nutrition-targets-api'
import type { Profile } from '@/lib/profile-api'

interface DailyTotals {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

interface NutritionTargetsCardProps {
  targets: NutritionTargets
  profile: Profile
  latestWeightKg: number | null
  avgWeeklyTrainingMinutes: number | null
  avgDailySteps: number | null
  consumed: DailyTotals
}

const NONE_VALUE = '__none__'

function missingProfileFields(profile: Profile, latestWeightKg: number | null): string[] {
  const missing: string[] = []
  if (!profile.sex) missing.push('sexe')
  if (!profile.height_cm) missing.push('taille')
  if (!profile.date_of_birth) missing.push('date de naissance')
  if (!profile.goal) missing.push('objectif')
  if (!latestWeightKg) missing.push('un poids loggé')
  return missing
}

export function NutritionTargetsCard({
  targets,
  profile,
  latestWeightKg,
  avgWeeklyTrainingMinutes,
  avgDailySteps,
  consumed,
}: NutritionTargetsCardProps) {
  const [expanded, setExpanded] = useState(targets.activity_level === null)
  const [activityLevel, setActivityLevel] = useState<string>(
    targets.activity_level ?? NONE_VALUE,
  )
  const [proteinG, setProteinG] = useState(targets.protein_g_target?.toString() ?? '')
  const [carbsG, setCarbsG] = useState(targets.carbs_g_target?.toString() ?? '')
  const [fatG, setFatG] = useState(targets.fat_g_target?.toString() ?? '')
  const updateNutritionTargets = useUpdateNutritionTargets()

  // Calories are never typed directly — they're always the sum of the
  // three macros below, so editing protein/carbs/fat always moves the
  // calorie total too, and the two can never silently disagree.
  const macrosAreEmpty = proteinG.trim() === '' && carbsG.trim() === '' && fatG.trim() === ''
  const computedCalories = macrosAreEmpty
    ? null
    : caloriesFromMacros(Number(proteinG) || 0, Number(carbsG) || 0, Number(fatG) || 0)

  const missing = missingProfileFields(profile, latestWeightKg)
  const usingSteps = avgDailySteps !== null && avgDailySteps > 0
  const effectiveDailyMultiplier = usingSteps
    ? dailyActivityMultiplierFromSteps(avgDailySteps)
    : activityLevel !== NONE_VALUE
      ? DAILY_ACTIVITY_MULTIPLIERS[activityLevel as DailyActivityLevel]
      : null
  const canAutoCalculate =
    missing.length === 0 && avgWeeklyTrainingMinutes !== null && effectiveDailyMultiplier !== null

  function calculateWith(dailyActivityMultiplier: number) {
    if (
      missing.length > 0 ||
      avgWeeklyTrainingMinutes === null ||
      !profile.sex ||
      !profile.height_cm ||
      !profile.date_of_birth ||
      !profile.goal ||
      !latestWeightKg
    ) {
      return
    }
    const result = computeNutritionTargets({
      sex: profile.sex,
      weightKg: latestWeightKg,
      heightCm: profile.height_cm,
      age: computeAge(profile.date_of_birth),
      dailyActivityMultiplier,
      avgWeeklyTrainingMinutes,
      goal: profile.goal,
    })
    setProteinG(result.proteinGTarget.toString())
    setCarbsG(result.carbsGTarget.toString())
    setFatG(result.fatGTarget.toString())
  }

  // Recalculates immediately on selection, not just via the "Recalculer"
  // button below — previously the 4 fields only updated on an explicit
  // click, so switching activity level and saving without re-clicking
  // silently kept the old level's numbers under the new label. Manual
  // edits made after picking a level still stick until it changes again.
  // Only relevant when the select is actually driving the calc — inert
  // while avg_daily_steps takes priority (select disabled in that case).
  function handleActivityLevelChange(next: string) {
    setActivityLevel(next)
    if (!usingSteps && next !== NONE_VALUE) {
      calculateWith(DAILY_ACTIVITY_MULTIPLIERS[next as DailyActivityLevel])
    }
  }

  function handleRecalculate() {
    if (effectiveDailyMultiplier !== null) calculateWith(effectiveDailyMultiplier)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    await updateNutritionTargets.mutateAsync({
      activity_level: activityLevel === NONE_VALUE ? null : (activityLevel as DailyActivityLevel),
      calories_target: computedCalories,
      protein_g_target: proteinG.trim() === '' ? null : Number(proteinG),
      carbs_g_target: carbsG.trim() === '' ? null : Number(carbsG),
      fat_g_target: fatG.trim() === '' ? null : Number(fatG),
    })
    setExpanded(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-lg">
          Cibles du jour
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <MacroProgressBar
            label="Calories"
            consumed={consumed.calories}
            target={targets.calories_target}
            unit="kcal"
          />
          <MacroProgressBar
            label="Protéines"
            consumed={consumed.proteinG}
            target={targets.protein_g_target}
            unit="g"
          />
          <MacroProgressBar
            label="Glucides"
            consumed={consumed.carbsG}
            target={targets.carbs_g_target}
            unit="g"
          />
          <MacroProgressBar
            label="Lipides"
            consumed={consumed.fatG}
            target={targets.fat_g_target}
            unit="g"
          />
        </div>

        <button
          type="button"
          className="flex items-center gap-1.5 self-start text-sm text-primary"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          Ajuster mes cibles
          <ChevronDown
            className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        {expanded && (
          <form onSubmit={(event) => void handleSave(event)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="activity-level">Activité quotidienne / professionnelle</Label>
              <Select
                value={activityLevel}
                onValueChange={handleActivityLevelChange}
                disabled={usingSteps}
              >
                <SelectTrigger id="activity-level">
                  <SelectValue placeholder="Non renseigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Non renseigné</SelectItem>
                  {(
                    Object.entries(DAILY_ACTIVITY_LEVEL_LABELS) as [DailyActivityLevel, string][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {usingSteps ? (
                <p className="text-xs text-muted-foreground">
                  Basé sur tes ~{avgDailySteps.toLocaleString('fr-FR')} pas/jour en moyenne (fiche
                  coaching), plus précis que le menu ci-dessus, qui n'est pas utilisé tant que ce
                  champ reste rempli.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Remplis "Nombre de pas moyen par jour" dans ta fiche coaching pour un calcul plus
                  précis que ce menu.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {avgWeeklyTrainingMinutes === null
                  ? 'Volume d’entraînement : calcul en cours…'
                  : `Volume d'entraînement pris en compte : ~${Math.round(avgWeeklyTrainingMinutes)} min/semaine (moyenne des 14 derniers jours, calculée automatiquement à partir de tes séances loguées).`}
              </p>
            </div>

            {missing.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                Complète ton profil ({missing.join(', ')}) sur ta{' '}
                <Link to="/profile" className="text-primary hover:underline">
                  page profil
                </Link>{' '}
                pour calculer tes cibles automatiquement. Tu peux sinon les saisir toi-même
                ci-dessous.
              </p>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={!canAutoCalculate}
                onClick={handleRecalculate}
              >
                Recalculer
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              Semaine plus active que d'habitude (rando, surf, déménagement…) ? Ajuste
              simplement les valeurs ci-dessous à la main : il n'y a pas encore de suivi
              automatique pour ce type d'activité.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="calories-target">Calories (kcal)</Label>
                <Input id="calories-target" value={computedCalories ?? ''} disabled />
                <p className="text-xs text-muted-foreground">
                  Calculées à partir des protéines, glucides et lipides ci-dessous.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="protein-target">Protéines (g)</Label>
                <Input
                  id="protein-target"
                  type="number"
                  min={0}
                  value={proteinG}
                  onChange={(event) => setProteinG(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="carbs-target">Glucides (g)</Label>
                <Input
                  id="carbs-target"
                  type="number"
                  min={0}
                  value={carbsG}
                  onChange={(event) => setCarbsG(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="fat-target">Lipides (g)</Label>
                <Input
                  id="fat-target"
                  type="number"
                  min={0}
                  value={fatG}
                  onChange={(event) => setFatG(event.target.value)}
                />
              </div>
            </div>

            <Button type="submit" disabled={updateNutritionTargets.isPending}>
              {updateNutritionTargets.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
