import { type ChangeEvent, useRef, useState } from 'react'
import { Trash2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ExerciseThumbnail } from '@/components/ExerciseThumbnail'
import { useAuthStore } from '@/lib/auth-store'
import {
  useDeleteMilestone,
  useDeleteProgressPhoto,
  useSocialFeed,
  useUploadProgressPhoto,
} from '@/hooks/useSocialFeed'
import { formatMilestoneValue, MILESTONE_TYPE_LABELS } from '@/lib/social-display'
import type { FeedEntry } from '@/lib/social-display'

function formatAchievedAt(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatPhotoDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function todayLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function FeedPage() {
  const { data: feed, isLoading, isError } = useSocialFeed()
  const currentUserId = useAuthStore((state) => state.session?.user.id)
  const deleteMilestone = useDeleteMilestone()
  const deletePhoto = useDeleteProgressPhoto()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Feed</h1>

      <UploadPhotoCard />

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
              Rien pour l'instant. Active le partage de progrès dans ton profil pour que tes
              propres records et photos apparaissent ici pour les autres.
            </p>
          </CardContent>
        </Card>
      )}

      {feed && feed.length > 0 && (
        <ul className="flex flex-col gap-3">
          {feed.map((entry) => (
            <li key={`${entry.kind}-${entry.id}`}>
              {entry.kind === 'milestone' ? (
                <MilestoneCard
                  entry={entry}
                  isOwn={entry.userId === currentUserId}
                  onDelete={() => deleteMilestone.mutateAsync(entry.milestone.id)}
                />
              ) : (
                <PhotoCard
                  entry={entry}
                  isOwn={entry.userId === currentUserId}
                  onDelete={() => deletePhoto.mutateAsync(entry.photo)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FeedCardHeader({
  displayName,
  isOwn,
  onDelete,
  deleteLabel,
}: {
  displayName: string
  isOwn: boolean
  onDelete: () => Promise<void>
  deleteLabel: string
}) {
  return (
    <CardHeader>
      <CardTitle as="h2" className="flex items-center justify-between gap-2 text-base">
        <span className="flex items-center gap-2">
          <Trophy className="size-4 text-primary" />
          {displayName}
        </span>
        {isOwn && (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" size="icon-sm" aria-label={deleteLabel}>
                <Trash2 />
              </Button>
            }
            title="Supprimer cette entrée du feed ?"
            description="Cette action est irréversible."
            confirmLabel="Supprimer"
            onConfirm={onDelete}
          />
        )}
      </CardTitle>
    </CardHeader>
  )
}

function MilestoneCard({
  entry,
  isOwn,
  onDelete,
}: {
  entry: Extract<FeedEntry, { kind: 'milestone' }>
  isOwn: boolean
  onDelete: () => Promise<void>
}) {
  const { milestone } = entry
  return (
    <Card>
      <FeedCardHeader
        displayName={entry.displayName}
        isOwn={isOwn}
        onDelete={onDelete}
        deleteLabel="Supprimer ce record du feed"
      />
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {milestone.exercise_id && (
            <ExerciseThumbnail imageUrl={milestone.exercise?.image_url ?? null} muscleGroup={null} />
          )}
          <p className="font-medium">
            {MILESTONE_TYPE_LABELS[milestone.milestone_type]}
            {milestone.exercise_name && ` · ${milestone.exercise_name}`}
          </p>
        </div>
        <p className="font-mono text-lg font-semibold tabular-nums">
          {formatMilestoneValue(milestone)}
        </p>
        <p className="text-sm text-muted-foreground">{formatAchievedAt(milestone.achieved_at)}</p>
      </CardContent>
    </Card>
  )
}

function PhotoCard({
  entry,
  isOwn,
  onDelete,
}: {
  entry: Extract<FeedEntry, { kind: 'photo' }>
  isOwn: boolean
  onDelete: () => Promise<void>
}) {
  const { photo } = entry
  return (
    <Card>
      <FeedCardHeader
        displayName={entry.displayName}
        isOwn={isOwn}
        onDelete={onDelete}
        deleteLabel="Supprimer cette photo du feed"
      />
      <CardContent className="flex flex-col gap-2">
        <img
          src={entry.signedUrl}
          alt={photo.caption ?? 'Photo de progression'}
          className="max-h-96 w-full rounded-md object-cover"
        />
        {photo.caption && <p className="text-sm">{photo.caption}</p>}
        <p className="text-sm text-muted-foreground">{formatPhotoDate(photo.photo_date)}</p>
      </CardContent>
    </Card>
  )
}

function UploadPhotoCard() {
  const uploadPhoto = useUploadProgressPhoto()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [photoDate, setPhotoDate] = useState(todayLocalDate())

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setCaption('')
    setPhotoDate(todayLocalDate())
    uploadPhoto.reset()
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  async function handleSubmit() {
    if (!selectedFile) return
    await uploadPhoto.mutateAsync({
      file: selectedFile,
      input: { caption: caption.trim() === '' ? null : caption.trim(), photoDate },
    })
    reset()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Ajouter une photo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          aria-label="Choisir une photo"
          className="hidden"
          onChange={handleFileChange}
        />

        {!selectedFile ? (
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => fileInputRef.current?.click()}
          >
            Choisir une photo
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Aperçu"
                className="max-h-64 w-full rounded-md object-cover"
              />
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="photo-caption">Légende (optionnel)</Label>
              <Input
                id="photo-caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="photo-date">Date</Label>
              <Input
                id="photo-date"
                type="date"
                value={photoDate}
                onChange={(event) => setPhotoDate(event.target.value)}
              />
            </div>
            {uploadPhoto.isError && (
              <p role="alert" className="text-sm text-destructive">
                Impossible d'envoyer cette photo.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={uploadPhoto.isPending}
                onClick={() => void handleSubmit()}
              >
                {uploadPhoto.isPending ? 'Envoi…' : 'Publier'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={uploadPhoto.isPending}
                onClick={reset}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
