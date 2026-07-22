import { type FormEvent, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import {
  useDeleteWeightEntry,
  useLogWeightEntry,
  useWeightEntries,
} from '@/hooks/useWeightEntries'
import {
  GOAL_LABELS,
  SEX_LABELS,
  type Goal,
  type Profile,
  type Sex,
} from '@/lib/profile-api'

const SEX_OPTIONS = Object.entries(SEX_LABELS) as [Sex, string][]
const GOAL_OPTIONS = Object.entries(GOAL_LABELS) as [Goal, string][]

const NONE_VALUE = '__none__'

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ProfilePage() {
  const { data: profile, isLoading, isError } = useProfile()

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>
  if (isError || !profile)
    return (
      <p role="alert" className="text-destructive">
        Impossible de charger ton profil.
      </p>
    )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Mon profil</h1>
      <ProfileForm profile={profile} />
      <WeightSection />
    </div>
  )
}

function ProfileForm({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile()

  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth ?? '')
  const [sex, setSex] = useState<string>(profile.sex ?? NONE_VALUE)
  const [heightCm, setHeightCm] = useState(profile.height_cm?.toString() ?? '')
  const [goal, setGoal] = useState<string>(profile.goal ?? NONE_VALUE)
  const [targetWeightKg, setTargetWeightKg] = useState(
    profile.target_weight_kg?.toString() ?? '',
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await updateProfile.mutateAsync({
      display_name: displayName.trim() === '' ? null : displayName,
      date_of_birth: dateOfBirth === '' ? null : dateOfBirth,
      sex: sex === NONE_VALUE ? null : (sex as Sex),
      height_cm: heightCm.trim() === '' ? null : Number(heightCm),
      goal: goal === NONE_VALUE ? null : (goal as Goal),
      target_weight_kg: targetWeightKg.trim() === '' ? null : Number(targetWeightKg),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Informations</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="display-name">Nom affiché</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Optionnel"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="date-of-birth">Date de naissance</Label>
            <Input
              id="date-of-birth"
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sex">Sexe biologique</Label>
            <Select value={sex} onValueChange={setSex}>
              <SelectTrigger id="sex">
                <SelectValue placeholder="Non renseigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Non renseigné</SelectItem>
                {SEX_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="height">Taille (cm)</Label>
              <Input
                id="height"
                type="number"
                min={1}
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="target-weight">Poids cible (kg)</Label>
              <Input
                id="target-weight"
                type="number"
                min={1}
                step={0.1}
                value={targetWeightKg}
                onChange={(event) => setTargetWeightKg(event.target.value)}
                placeholder="Optionnel"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="goal">Objectif</Label>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger id="goal">
                <SelectValue placeholder="Non renseigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Non renseigné</SelectItem>
                {GOAL_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {updateProfile.isError && (
            <p role="alert" className="text-sm text-destructive">
              Impossible d'enregistrer le profil.
            </p>
          )}
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function WeightSection() {
  const { data: entries, isLoading } = useWeightEntries()
  const logEntry = useLogWeightEntry()
  const deleteEntry = useDeleteWeightEntry()
  const [weight, setWeight] = useState('')

  async function handleLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (weight.trim() === '') return
    await logEntry.mutateAsync({ weightKg: Number(weight), recordedAt: todayIsoDate() })
    setWeight('')
  }

  const sortedEntries = entries ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Poids</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          onSubmit={(event) => void handleLog(event)}
          className="flex items-end gap-2"
        >
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="log-weight">Peser aujourd'hui (kg)</Label>
            <Input
              id="log-weight"
              type="number"
              min={1}
              step={0.1}
              required
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={logEntry.isPending}>
            {logEntry.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>

        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {sortedEntries.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">
            Aucune pesée enregistrée pour l'instant.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {sortedEntries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
            >
              <div>
                <p className="font-mono font-medium tabular-nums">{entry.weight_kg} kg</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(entry.recorded_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Supprimer cette pesée"
                  >
                    <Trash2 />
                  </Button>
                }
                title="Supprimer cette pesée ?"
                description="Cette action est irréversible."
                confirmLabel="Supprimer"
                onConfirm={async () => {
                  await deleteEntry.mutateAsync(entry.id)
                }}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
