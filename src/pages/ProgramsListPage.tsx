import { Link } from 'react-router'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { usePrograms } from '@/hooks/usePrograms'
import { PROGRAM_FOCUS_LABELS, PROGRAM_STATUS_LABELS } from '@/lib/programs-api'

export function ProgramsListPage() {
  const { data: programs, isLoading, isError } = usePrograms()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Mes programmes</h1>
        <div className="flex gap-2">
          <Link to="/programs/generate" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full">
              <Sparkles /> Générer avec l'IA
            </Button>
          </Link>
          <Link to="/programs/new" className="flex-1 sm:flex-none">
            <Button className="w-full">Nouveau programme</Button>
          </Link>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Chargement…</p>}
      {isError && (
        <p role="alert" className="text-destructive">
          Impossible de charger tes programmes.
        </p>
      )}
      {programs?.length === 0 && (
        <p className="text-muted-foreground">
          Aucun programme pour l'instant. Crée le premier pour commencer.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {programs?.map((program) => (
          <li key={program.id}>
            <Link to={`/programs/${program.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle as="h2">{program.name}</CardTitle>
                  {program.description && (
                    <CardDescription>{program.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Badge>{PROGRAM_FOCUS_LABELS[program.focus]}</Badge>
                  <Badge variant="outline">{PROGRAM_STATUS_LABELS[program.status]}</Badge>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
