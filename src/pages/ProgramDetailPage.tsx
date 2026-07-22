import { Link, useNavigate, useParams } from 'react-router'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SessionTemplateCard } from '@/components/SessionTemplateCard'
import {
  useDeleteProgram,
  useDuplicateProgram,
  useProgram,
  useUpdateProgram,
} from '@/hooks/usePrograms'
import { useSessionTemplates } from '@/hooks/useSessionTemplates'
import { useDeleteSessionLog, useSessionLogs } from '@/hooks/useSessionLogs'
import {
  PROGRAM_FOCUS_LABELS,
  PROGRAM_STATUS_LABELS,
  type ProgramStatus,
} from '@/lib/programs-api'
import { WEEKDAY_LABELS } from '@/lib/sessions-api'

const PROGRAM_STATUS_OPTIONS: ProgramStatus[] = ['draft', 'active', 'archived']

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  if (!id) throw new Error('Missing program id in route params')

  const { data: program, isLoading, isError } = useProgram(id)
  const { data: templates } = useSessionTemplates(id)
  const logs = useSessionLogs(id)
  const deleteProgram = useDeleteProgram()
  const duplicateProgram = useDuplicateProgram()
  const deleteLog = useDeleteSessionLog()
  const updateProgram = useUpdateProgram(id)

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>
  if (isError || !program)
    return (
      <p role="alert" className="text-destructive">
        Programme introuvable.
      </p>
    )

  const sortedTemplates = templates ?? []
  const sortedLogs = logs ?? []
  const templateById = new Map(sortedTemplates.map((template) => [template.id, template]))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{program.name}</h1>
          {program.description && (
            <p className="mt-1 text-muted-foreground">{program.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{PROGRAM_FOCUS_LABELS[program.focus]}</Badge>
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
              {PROGRAM_STATUS_OPTIONS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={program.status === option ? 'default' : 'ghost'}
                  disabled={updateProgram.isPending}
                  onClick={() => {
                    if (program.status !== option)
                      updateProgram.mutate({ status: option })
                  }}
                >
                  {PROGRAM_STATUS_LABELS[option]}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={duplicateProgram.isPending}
            onClick={() =>
              duplicateProgram.mutate(program, {
                onSuccess: (newProgram) => void navigate(`/programs/${newProgram.id}`),
              })
            }
          >
            Dupliquer
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="sm">
                Supprimer
              </Button>
            }
            title="Supprimer ce programme ?"
            description="Cette action est irréversible et supprimera aussi ses jours et exercices."
            confirmLabel="Supprimer définitivement"
            onConfirm={async () => {
              await deleteProgram.mutateAsync(program.id)
              void navigate('/programs')
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Semaine type</h2>
        <ul className="flex flex-col gap-3">
          {sortedTemplates.map((template) => (
            <li key={template.id}>
              <SessionTemplateCard template={template} focus={program.focus} />
            </li>
          ))}
        </ul>
      </div>

      {sortedLogs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-medium">Historique</h2>
          <ul className="flex flex-col gap-2">
            {sortedLogs.map((log) => {
              const dayOfWeek = templateById.get(log.session_template_id)?.day_of_week
              return (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
                >
                  <Link
                    to={`/sessions/${log.id}`}
                    className="flex flex-1 items-center gap-2 hover:underline"
                  >
                    <span className="font-medium">
                      {dayOfWeek ? WEEKDAY_LABELS[dayOfWeek] : 'Séance'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(log.started_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <Badge variant={log.status === 'completed' ? 'default' : 'outline'}>
                      {log.status === 'completed' ? 'Terminée' : 'En cours'}
                    </Badge>
                  </Link>
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Supprimer cette séance"
                      >
                        <Trash2 />
                      </Button>
                    }
                    title="Supprimer cette séance ?"
                    description="Cette action est irréversible et supprimera les séries enregistrées."
                    confirmLabel="Supprimer"
                    onConfirm={async () => {
                      await deleteLog.mutateAsync(log.id)
                    }}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
