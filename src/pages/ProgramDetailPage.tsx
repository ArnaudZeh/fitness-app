import { useNavigate, useParams } from 'react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SessionTemplateCard } from '@/components/SessionTemplateCard'
import { SessionTemplateFormDialog } from '@/components/SessionTemplateFormDialog'
import { useDeleteProgram, useDuplicateProgram, useProgram } from '@/hooks/usePrograms'
import {
  useCreateSessionTemplate,
  useSessionTemplates,
  useSwapSessionTemplateOrder,
} from '@/hooks/useSessionTemplates'
import { getSwapPair } from '@/lib/ordering'
import { PROGRAM_FOCUS_LABELS, PROGRAM_STATUS_LABELS } from '@/lib/programs-api'

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  if (!id) throw new Error('Missing program id in route params')

  const { data: program, isLoading, isError } = useProgram(id)
  const { data: templates } = useSessionTemplates(id)
  const createTemplate = useCreateSessionTemplate(id)
  const swapTemplateOrder = useSwapSessionTemplateOrder(id)
  const deleteProgram = useDeleteProgram()
  const duplicateProgram = useDuplicateProgram()

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>
  if (isError || !program)
    return (
      <p role="alert" className="text-destructive">
        Programme introuvable.
      </p>
    )

  const sortedTemplates = templates ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{program.name}</h1>
          {program.description && (
            <p className="mt-1 text-muted-foreground">{program.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Badge>{PROGRAM_FOCUS_LABELS[program.focus]}</Badge>
            <Badge variant="outline">{PROGRAM_STATUS_LABELS[program.status]}</Badge>
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
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-medium">Structure de la semaine</h2>
          <SessionTemplateFormDialog
            trigger={
              <Button size="sm">
                <Plus /> Ajouter un jour
              </Button>
            }
            submitLabel="Ajouter le jour"
            onSubmit={async (name) => {
              await createTemplate.mutateAsync(name)
            }}
          />
        </div>

        {sortedTemplates.length === 0 && (
          <p className="text-muted-foreground">
            Aucun jour défini. Ajoute un jour (ex. "Jour A") pour commencer à structurer
            ce programme.
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {sortedTemplates.map((template, index) => (
            <li key={template.id}>
              <SessionTemplateCard
                template={template}
                isFirst={index === 0}
                isLast={index === sortedTemplates.length - 1}
                onMove={(direction) => {
                  const pair = getSwapPair(sortedTemplates, template.id, direction)
                  if (pair) void swapTemplateOrder.mutateAsync({ a: pair[0], b: pair[1] })
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
