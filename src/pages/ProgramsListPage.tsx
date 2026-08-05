import { useState } from 'react'
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
import { useProgramsWeekOverview } from '@/hooks/useSessionTemplates'
import {
  PROGRAM_FOCUS_LABELS,
  PROGRAM_STATUS_LABELS,
  type ProgramStatus,
} from '@/lib/programs-api'
import { WEEKDAY_SHORT_LABELS } from '@/lib/sessions-api'

type StatusFilter = 'all' | ProgramStatus

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: PROGRAM_STATUS_LABELS.active },
  { value: 'draft', label: PROGRAM_STATUS_LABELS.draft },
  { value: 'archived', label: PROGRAM_STATUS_LABELS.archived },
]

export function ProgramsListPage() {
  const { data: programs, isLoading, isError } = usePrograms()
  const { data: weekOverview } = useProgramsWeekOverview(
    programs?.map((program) => program.id) ?? [],
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filteredPrograms = programs?.filter(
    (program) => statusFilter === 'all' || program.status === statusFilter,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Mes programmes</h1>
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

      {programs && programs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border p-0.5">
          {STATUS_FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={statusFilter === option.value ? 'default' : 'ghost'}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}

      {statusFilter !== 'all' && filteredPrograms?.length === 0 && (
        <p className="text-muted-foreground">
          Aucun programme « {PROGRAM_STATUS_LABELS[statusFilter]} ».
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {filteredPrograms?.map((program) => {
          const days = weekOverview?.[program.id] ?? []
          const trainingDays = days.filter((day) => day.day_type === 'training')
          return (
            <li key={program.id}>
              <Link to={`/programs/${program.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle as="h2">{program.name}</CardTitle>
                    {program.description && (
                      <CardDescription>{program.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Badge>{PROGRAM_FOCUS_LABELS[program.focus]}</Badge>
                      <Badge variant="outline">
                        {PROGRAM_STATUS_LABELS[program.status]}
                      </Badge>
                    </div>
                    {trainingDays.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {trainingDays.map((day) => (
                          <Badge
                            key={day.day_of_week}
                            variant="outline"
                            className="font-normal text-muted-foreground"
                          >
                            {WEEKDAY_SHORT_LABELS[day.day_of_week]}
                            {day.label ? ` · ${day.label}` : ''}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
