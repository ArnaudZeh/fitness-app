import { Link, useParams } from 'react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SessionTemplateCard } from '@/components/SessionTemplateCard'
import { SessionTemplateFormDialog } from '@/components/SessionTemplateFormDialog'
import { useBlock } from '@/hooks/usePrograms'
import {
  useCreateSessionTemplate,
  useGenerateBlockSessions,
  useSessionTemplates,
  useSessions,
  useSwapSessionTemplateOrder,
} from '@/hooks/useSessionTemplates'
import { getSwapPair } from '@/lib/ordering'
import { BLOCK_FOCUS_LABELS, BLOCK_TYPE_LABELS } from '@/lib/programs-api'

export function BlockDetailPage() {
  const { programId, blockId } = useParams<{ programId: string; blockId: string }>()
  if (!programId || !blockId) throw new Error('Missing route params')

  const { data: block, isLoading, isError } = useBlock(blockId)
  const { data: templates } = useSessionTemplates(blockId)
  const { data: sessions } = useSessions(blockId)
  const createTemplate = useCreateSessionTemplate(blockId)
  const swapTemplateOrder = useSwapSessionTemplateOrder(blockId)
  const generateSessions = useGenerateBlockSessions(blockId)

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>
  if (isError || !block)
    return (
      <p role="alert" className="text-destructive">
        Bloc introuvable.
      </p>
    )

  const sortedTemplates = templates ?? []
  const sessionCount = sessions?.length ?? 0
  const sessionsByWeek = new Map<number, number>()
  for (const session of sessions ?? []) {
    sessionsByWeek.set(
      session.week_number,
      (sessionsByWeek.get(session.week_number) ?? 0) + 1,
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to={`/programs/${programId}`}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          ← Retour au programme
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{block.name}</h1>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline">{BLOCK_TYPE_LABELS[block.block_type]}</Badge>
          <Badge variant="outline">{BLOCK_FOCUS_LABELS[block.focus]}</Badge>
          <span className="text-sm text-muted-foreground">
            {block.duration_weeks} semaine{block.duration_weeks > 1 ? 's' : ''}
          </span>
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
            la semaine.
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

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <h2 className="font-heading text-lg font-medium">Séances hebdomadaires</h2>
        <p className="text-sm text-muted-foreground">
          Génère {block.duration_weeks} semaine{block.duration_weeks > 1 ? 's' : ''} ×{' '}
          {sortedTemplates.length} jour{sortedTemplates.length > 1 ? 's' : ''} de séances
          à partir de cette structure. Peut être relancé sans risque après un changement —
          les séances déjà générées ne sont pas dupliquées.
        </p>
        <Button
          variant="outline"
          disabled={sortedTemplates.length === 0 || generateSessions.isPending}
          onClick={() => generateSessions.mutate()}
          className="self-start"
        >
          {generateSessions.isPending ? 'Génération…' : 'Générer les séances'}
        </Button>
        {sessionCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {sessionCount} séance{sessionCount > 1 ? 's' : ''} générée
            {sessionCount > 1 ? 's' : ''} sur {sessionsByWeek.size} semaine
            {sessionsByWeek.size > 1 ? 's' : ''}.
          </p>
        )}
      </div>
    </div>
  )
}
