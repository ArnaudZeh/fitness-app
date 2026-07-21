import { useNavigate, useParams } from 'react-router'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BlockFormDialog } from '@/components/BlockFormDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  useBlocks,
  useCreateBlock,
  useDeleteBlock,
  useDeleteProgram,
  useDuplicateProgram,
  useProgram,
  useSwapBlockOrder,
  useUpdateBlock,
} from '@/hooks/usePrograms'
import {
  BLOCK_FOCUS_LABELS,
  BLOCK_TYPE_LABELS,
  PROGRAM_STATUS_LABELS,
  getSwapPair,
} from '@/lib/programs-api'

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  if (!id) throw new Error('Missing program id in route params')

  const { data: program, isLoading, isError } = useProgram(id)
  const { data: blocks } = useBlocks(id)
  const createBlock = useCreateBlock(id)
  const updateBlock = useUpdateBlock(id)
  const deleteBlock = useDeleteBlock(id)
  const swapBlockOrder = useSwapBlockOrder(id)
  const deleteProgram = useDeleteProgram()
  const duplicateProgram = useDuplicateProgram()

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>
  if (isError || !program)
    return (
      <p role="alert" className="text-destructive">
        Programme introuvable.
      </p>
    )

  const sortedBlocks = blocks ?? []

  async function moveBlock(blockId: string, direction: 'up' | 'down') {
    const pair = getSwapPair(sortedBlocks, blockId, direction)
    if (!pair) return
    const [a, b] = pair
    await swapBlockOrder.mutateAsync({ a, b })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{program.name}</h1>
          {program.description && (
            <p className="mt-1 text-muted-foreground">{program.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">{PROGRAM_STATUS_LABELS[program.status]}</Badge>
            <span className="text-sm text-muted-foreground">v{program.version}</span>
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
            description="Cette action est irréversible et supprimera aussi tous ses blocs."
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
          <h2 className="font-heading text-lg font-medium">Blocs de périodisation</h2>
          <BlockFormDialog
            trigger={
              <Button size="sm">
                <Plus /> Ajouter un bloc
              </Button>
            }
            submitLabel="Ajouter le bloc"
            onSubmit={async (input) => {
              await createBlock.mutateAsync(input)
            }}
          />
        </div>

        {sortedBlocks.length === 0 && (
          <p className="text-muted-foreground">
            Aucun bloc pour l'instant. Ajoute le premier pour structurer ce programme.
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {sortedBlocks.map((block, index) => (
            <li key={block.id}>
              <Card>
                <CardHeader>
                  <CardTitle as="h3">{block.name}</CardTitle>
                  <CardDescription>
                    {BLOCK_TYPE_LABELS[block.block_type]} ·{' '}
                    {BLOCK_FOCUS_LABELS[block.focus]} · {block.duration_weeks} semaine
                    {block.duration_weeks > 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Monter ce bloc"
                    disabled={index === 0}
                    onClick={() => void moveBlock(block.id, 'up')}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Descendre ce bloc"
                    disabled={index === sortedBlocks.length - 1}
                    onClick={() => void moveBlock(block.id, 'down')}
                  >
                    <ArrowDown />
                  </Button>
                  <BlockFormDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Modifier ce bloc"
                      >
                        <Pencil />
                      </Button>
                    }
                    submitLabel="Enregistrer"
                    initialValue={block}
                    onSubmit={async (input) => {
                      await updateBlock.mutateAsync({ id: block.id, patch: input })
                    }}
                  />
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Supprimer ce bloc"
                      >
                        <Trash2 />
                      </Button>
                    }
                    title="Supprimer ce bloc ?"
                    description="Cette action est irréversible."
                    confirmLabel="Supprimer"
                    onConfirm={async () => {
                      await deleteBlock.mutateAsync(block.id)
                    }}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
