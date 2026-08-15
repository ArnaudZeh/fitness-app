import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// P0 : squelette de route uniquement, pour valider la nav avant de
// construire dessus. P1 ajoute la configuration des repas (meal_slots), le
// calcul des cibles (nutrition_targets) et le log manuel (food_logs) — voir
// TODOS.md ("Nutrition — plan de phases scopé").
export function NutritionPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nutrition</h1>
      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">
            Bientôt disponible
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le suivi de tes calories et macros arrive dans une prochaine mise à jour.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
