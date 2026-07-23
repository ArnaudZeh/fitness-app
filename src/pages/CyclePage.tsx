import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useProfile } from '@/hooks/useProfile'
import {
  useCreateCycleEntry,
  useCycleEntries,
  useDeleteCycleEntry,
  useUpdateCycleEntry,
} from '@/hooks/useCycleEntries'
import { CYCLE_PHASE_ADVICE } from '@/lib/cycle-advice'
import { CYCLE_PHASE_LABELS, computeCyclePhase } from '@/lib/cycle-phase'
import type { CycleEntry } from '@/lib/cycle-api'

function todayLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function CyclePage() {
  const { data: profile, isLoading } = useProfile()

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>

  if (!profile?.cycle_module_enabled) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Cycle</h1>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Ce module est désactivé. Active-le depuis ton profil pour suivre ton cycle et
              voir des repères par phase.
            </p>
            <Link to="/profile">
              <Button type="button" size="sm" className="self-start">
                Aller au profil
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Cycle</h1>

      <Card className="border-muted-foreground/30 bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Ces repères sont des recommandations générales, pas un avis médical. Ils ne
            remplacent pas un suivi gynécologique et ne tiennent pas compte de conditions
            particulières (SOPK, endométriose, contraception hormonale…).
          </p>
        </CardContent>
      </Card>

      <PhaseCard />
      <HistoryCard />
    </div>
  )
}

function PhaseCard() {
  const { data: entries, isLoading } = useCycleEntries()

  if (isLoading) return null

  const sortedStartDates = (entries ?? []).map((entry) => entry.start_date)
  const result = computeCyclePhase(sortedStartDates, todayLocalDate())

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h2">Phase actuelle</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune date enregistrée pour l'instant. Ajoute la date de début de tes dernières
            règles ci-dessous pour voir une estimation de phase.
          </p>
        </CardContent>
      </Card>
    )
  }

  const advice = CYCLE_PHASE_ADVICE[result.phase]

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Phase actuelle : {CYCLE_PHASE_LABELS[result.phase]}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Jour {result.cycleDay} d'un cycle estimé à {result.cycleLengthDays} jours.
        </p>
        <div>
          <p className="text-sm font-medium">Entraînement</p>
          <p className="text-sm text-muted-foreground">{advice.training}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Nutrition</p>
          <p className="text-sm text-muted-foreground">{advice.nutrition}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function HistoryCard() {
  const { data: entries, isLoading } = useCycleEntries()
  const createEntry = useCreateCycleEntry()
  const deleteEntry = useDeleteCycleEntry()
  const [startDate, setStartDate] = useState('')
  const [editing, setEditing] = useState<CycleEntry | null>(null)

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (startDate === '') return
    await createEntry.mutateAsync(startDate)
    setStartDate('')
  }

  const sortedEntries = [...(entries ?? [])].sort((a, b) =>
    b.start_date.localeCompare(a.start_date),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Historique</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={(event) => void handleAdd(event)} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="cycle-start-date">Début des dernières règles</Label>
            <Input
              id="cycle-start-date"
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={createEntry.isPending || startDate === ''}>
            {createEntry.isPending ? 'Ajout…' : 'Ajouter'}
          </Button>
        </form>
        {createEntry.isError && (
          <p role="alert" className="text-sm text-destructive">
            Impossible d'ajouter cette date (peut-être déjà enregistrée).
          </p>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {sortedEntries.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">Aucune date enregistrée pour l'instant.</p>
        )}

        <ul className="flex flex-col gap-2">
          {sortedEntries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
            >
              <p className="text-sm font-medium">{formatDate(entry.start_date)}</p>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Modifier la date du ${formatDate(entry.start_date)}`}
                  onClick={() => setEditing(entry)}
                >
                  <Pencil />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Supprimer la date du ${formatDate(entry.start_date)}`}
                    >
                      <Trash2 />
                    </Button>
                  }
                  title="Supprimer cette date ?"
                  description="Cette action est irréversible."
                  confirmLabel="Supprimer"
                  onConfirm={async () => {
                    await deleteEntry.mutateAsync(entry.id)
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      {editing && (
        <EditEntryDialogInline entry={editing} onClose={() => setEditing(null)} />
      )}
    </Card>
  )
}

function EditEntryDialogInline({
  entry,
  onClose,
}: {
  entry: CycleEntry
  onClose: () => void
}) {
  const updateEntry = useUpdateCycleEntry()
  const [startDate, setStartDate] = useState(entry.start_date)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (startDate === '') return
    await updateEntry.mutateAsync({ id: entry.id, startDate })
    onClose()
  }

  return (
    <CardContent className="border-t border-border pt-4">
      <form onSubmit={(event) => void handleSubmit(event)} className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="edit-cycle-start-date">Modifier la date</Label>
          <Input
            id="edit-cycle-start-date"
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={updateEntry.isPending || startDate === ''}>
          Enregistrer
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Annuler
        </Button>
      </form>
      {updateEntry.isError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Impossible d'enregistrer cette modification.
        </p>
      )}
    </CardContent>
  )
}
