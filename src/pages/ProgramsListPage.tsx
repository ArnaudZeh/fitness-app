import { Link } from 'react-router'
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
import { PROGRAM_STATUS_LABELS } from '@/lib/programs-api'

export function ProgramsListPage() {
  const { data: programs, isLoading, isError } = usePrograms()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mes programmes</h1>
        <Link to="/programs/new">
          <Button>Nouveau programme</Button>
        </Link>
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
                  <Badge variant="outline">{PROGRAM_STATUS_LABELS[program.status]}</Badge>
                  <span className="text-sm text-muted-foreground">
                    v{program.version}
                  </span>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
