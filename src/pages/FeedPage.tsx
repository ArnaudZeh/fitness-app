import { Trash2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAuthStore } from '@/lib/auth-store'
import { useDeleteMilestone, useSocialFeed } from '@/hooks/useSocialFeed'
import { MILESTONE_TYPE_LABELS } from '@/lib/social-api'
import type { FeedItem } from '@/lib/social-api'

function formatAchievedAt(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

export function FeedPage() {
  const { data: feed, isLoading, isError } = useSocialFeed()
  const currentUserId = useAuthStore((state) => state.session?.user.id)
  const deleteMilestone = useDeleteMilestone()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Feed</h1>

      {isLoading && <p className="text-muted-foreground">Chargement…</p>}
      {isError && (
        <p role="alert" className="text-destructive">
          Impossible de charger le feed.
        </p>
      )}

      {feed && feed.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Aucun record partagé pour l'instant. Active le partage de progrès dans ton profil
              pour que tes propres records apparaissent ici pour les autres.
            </p>
          </CardContent>
        </Card>
      )}

      {feed && feed.length > 0 && (
        <ul className="flex flex-col gap-3">
          {feed.map((item) => (
            <li key={item.id}>
              <FeedItemCard
                item={item}
                isOwn={item.user_id === currentUserId}
                onDelete={() => deleteMilestone.mutateAsync(item.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FeedItemCard({
  item,
  isOwn,
  onDelete,
}: {
  item: FeedItem
  isOwn: boolean
  onDelete: () => Promise<void>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            {item.displayName}
          </span>
          {isOwn && (
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Supprimer ce record du feed"
                >
                  <Trash2 />
                </Button>
              }
              title="Supprimer ce record du feed ?"
              description="Cette action est irréversible."
              confirmLabel="Supprimer"
              onConfirm={onDelete}
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="font-medium">
          {MILESTONE_TYPE_LABELS[item.milestone_type]}
          {item.exercise_name && ` — ${item.exercise_name}`}
        </p>
        {/* kg is correct for the only milestone_type P9a detects
            (one_rep_max) — P9b's weekly_tonnage is also kg, but
            regularity_streak (weeks) will need a per-type unit. */}
        <p className="font-mono text-lg font-semibold tabular-nums">{item.value} kg</p>
        <p className="text-sm text-muted-foreground">{formatAchievedAt(item.achieved_at)}</p>
      </CardContent>
    </Card>
  )
}
