import { Link } from 'react-router'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Bonjour</h1>
      <Link to="/programs">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Mes programmes</CardTitle>
            <CardDescription>
              Créer, éditer et suivre tes programmes de musculation
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  )
}
