import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCoachingProfile, useUpdateCoachingProfile } from '@/hooks/useCoachingProfile'
import type { CoachingProfile, CoachingProfileInput } from '@/lib/coaching-profile-api'
import {
  COACHING_CATEGORIES,
  type CoachingCategoryDef,
  type CoachingFieldDef,
} from '@/lib/coaching-profile-fields'

const NONE_VALUE = '__none__'
const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Oui' },
  { value: 'false', label: 'Non' },
]

type FormValues = Record<string, string>

function toFormValue(field: CoachingFieldDef, profile: CoachingProfile): string {
  const raw = profile[field.key]
  if (raw === null || raw === undefined) {
    return field.type === 'select' || field.type === 'boolean' ? NONE_VALUE : ''
  }
  if (field.type === 'boolean') return raw ? 'true' : 'false'
  // Postgres `time` comes back as "HH:MM:SS" — <input type="time"> wants "HH:MM".
  if (field.type === 'time') return String(raw).slice(0, 5)
  return String(raw)
}

function toFormValues(category: CoachingCategoryDef, profile: CoachingProfile): FormValues {
  const values: FormValues = {}
  for (const field of category.fields) {
    values[field.key] = toFormValue(field, profile)
  }
  return values
}

function toPatchValue(field: CoachingFieldDef, value: string): string | number | boolean | null {
  if (field.type === 'select') return value === NONE_VALUE ? null : value
  if (field.type === 'boolean') return value === NONE_VALUE ? null : value === 'true'
  if (field.type === 'number') return value.trim() === '' ? null : Number(value)
  return value.trim() === '' ? null : value
}

function toPatch(category: CoachingCategoryDef, values: FormValues): CoachingProfileInput {
  const patch: CoachingProfileInput = {}
  for (const field of category.fields) {
    // @ts-expect-error -- field.key ranges over every CoachingProfileInput key by construction.
    patch[field.key] = toPatchValue(field, values[field.key] ?? '')
  }
  return patch
}

export function CoachingProfilePage() {
  const { data: profile, isLoading, isError } = useCoachingProfile()

  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>
  if (isError || !profile)
    return (
      <p role="alert" className="text-destructive">
        Impossible de charger ta fiche coaching.
      </p>
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fiche coaching</h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/profile">Retour au profil</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Tout est facultatif — plus c’est rempli, plus le coach IA (et un export vers un autre
        assistant) peut te guider précisément. Rien de ce qui est ici n’est jamais visible par
        tes amis ni public.
      </p>
      {COACHING_CATEGORIES.map((category) => (
        <CoachingCategorySection key={category.id} category={category} profile={profile} />
      ))}
    </div>
  )
}

function CoachingCategorySection({
  category,
  profile,
}: {
  category: CoachingCategoryDef
  profile: CoachingProfile
}) {
  const updateCoachingProfile = useUpdateCoachingProfile()
  const [expanded, setExpanded] = useState(category.defaultExpanded ?? false)
  const [values, setValues] = useState<FormValues>(() => toFormValues(category, profile))

  function setField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await updateCoachingProfile.mutateAsync(toPatch(category, values))
  }

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <div>
            <CardTitle as="h2">{category.title}</CardTitle>
            {category.description && <CardDescription>{category.description}</CardDescription>}
          </div>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </CardHeader>
      {expanded && (
        <CardContent>
          <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
            {category.fields.map((field) => (
              <CoachingField
                key={field.key}
                field={field}
                value={values[field.key] ?? ''}
                onChange={(value) => setField(field.key, value)}
              />
            ))}
            {updateCoachingProfile.isError && (
              <p role="alert" className="text-sm text-destructive">
                Impossible d’enregistrer cette section.
              </p>
            )}
            <Button
              type="submit"
              size="sm"
              className="self-start"
              disabled={updateCoachingProfile.isPending}
            >
              {updateCoachingProfile.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  )
}

function CoachingField({
  field,
  value,
  onChange,
}: {
  field: CoachingFieldDef
  value: string
  onChange: (value: string) => void
}) {
  const id = `coaching-${field.key}`

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{field.label}</Label>
      {field.helperText && <p className="text-xs text-muted-foreground">{field.helperText}</p>}
      {field.type === 'textarea' && (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Optionnel"
        />
      )}
      {field.type === 'text' && (
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Optionnel"
        />
      )}
      {field.type === 'number' && (
        <Input
          id={id}
          type="number"
          step={field.step ?? 1}
          min={field.min}
          max={field.max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Optionnel"
        />
      )}
      {field.type === 'date' && (
        <Input
          id={id}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.type === 'time' && (
        <Input
          id={id}
          type="time"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {(field.type === 'select' || field.type === 'boolean') && (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Non renseigné" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Non renseigné</SelectItem>
            {(field.type === 'boolean' ? BOOLEAN_OPTIONS : (field.options ?? [])).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
