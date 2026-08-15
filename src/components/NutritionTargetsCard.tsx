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
  computeAge,
  computeNutritionTargets,
  DAILY_ACTIVITY_LEVEL_LABELS,
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
  avgSessionsPerWeek: number | null
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
  avgSessionsPerWeek,
  consumed,
}: NutritionTargetsCardProps) {
  const [expanded, setExpanded] = useState(targets.activity_level === null)
  const [activityLevel, setActivityLevel] = useState<string>(
    targets.activity_level ?? NONE_VALUE,
  )
  const [calories, setCalories] = useState(targets.calories_target?.toString() ?? '')
  const [proteinG, setProteinG] = useState(targets.protein_g_target?.toString() ?? '')
  const [carbsG, setCarbsG] = useState(targets.carbs_g_target?.toString() ?? '')
  const [fatG, setFatG] = useState(targets.fat_g_target?.toString() ?? '')
  const updateNutritionTargets = useUpdateNutritionTargets()

  const missing = missingProfileFields(profile, latestWeightKg)
  const canAutoCalculate = missing.length === 0 && avgSessionsPerWeek !== null

  function calculateWith(dailyActivityLevel: DailyActivityLevel) {
    if (!canAutoCalculate || !profile.sex || !profile.height_cm || !profile.date_of_birth ||
      !profile.goal || !latestWeightKg || avgSessionsPerWeek === null) {
      return
    }
    const result = computeNutritionTargets({
      sex: profile.sex,
      weightKg: latestWeightKg,
      heightCm: profile.height_cm,
      age: computeAge(profile.date_of_birth),
      dailyActivityLevel,
      avgSessionsPerWeek,
      goal: profile.goal,
    })
    setCalories(result.caloriesTarget.toString())
    setProteinG(result.proteinGTarget.toString())
    setCarbsG(result.carbsGTarget.toString())
    setFatG(result.fatGTarget.toString())
  }

  // Recalculates immediately on selection, not just via the button below —
  // previously the 4 fields only updated on an explicit "Calculer" click,
  // so switching activity level and saving without re-clicking silently
  // kept the old level's numbers under the new label. Manual edits made
  // after picking a level still stick until the level changes again.
  function handleActivityLevelChange(next: string) {
    setActivityLevel(next)
    if (next !== NONE_VALUE) calculateWith(next as DailyActivityLevel)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    await updateNutritionTargets.mutateAsync({
      activity_level: activityLevel === NONE_VALUE ? null : (activityLevel as DailyActivityLevel),
      calories_target: calories.trim() === '' ? null : Number(calories),
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
              <Select value={activityLevel} onValueChange={handleActivityLevelChange}>
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
              <p className="text-xs text-muted-foreground">
                {avgSessionsPerWeek === null
                  ? 'Volume d’entraînement : calcul en cours…'
                  : `Volume d'entraînement pris en compte : ~${avgSessionsPerWeek.toFixed(1)} séance(s)/semaine (moyenne des 14 derniers jours, calculée automatiquement).`}
              </p>
            </div>

            {missing.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                Complète ton profil ({missing.join(', ')}) sur ta{' '}
                <Link to="/profile" className="text-primary hover:underline">
                  page profil
                </Link>{' '}
                pour calculer tes cibles automatiquement — tu peux sinon les saisir toi-même
                ci-dessous.
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="calories-target">Calories (kcal)</Label>
                <Input
                  id="calories-target"
                  type="number"
                  min={0}
                  value={calories}
                  onChange={(event) => setCalories(event.target.value)}
                />
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
