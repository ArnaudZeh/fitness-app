import { useState } from 'react'
import {
  Activity,
  BicepsFlexed,
  CircleDot,
  Dumbbell,
  Footprints,
  type LucideIcon,
  PersonStanding,
  Plus,
  Shirt,
  Target,
} from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import type { Exercise } from '@/lib/exercises-api'

export const NEW_EXERCISE_VALUE = '__new__'

const MUSCLE_GROUP_ICONS: Record<string, LucideIcon> = {
  pectoraux: Dumbbell,
  dos: Shirt,
  épaules: PersonStanding,
  bras: BicepsFlexed,
  jambes: Footprints,
  core: Target,
  full_body: Activity,
}

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  pectoraux: 'Pectoraux',
  dos: 'Dos',
  épaules: 'Épaules',
  bras: 'Bras',
  jambes: 'Jambes',
  core: 'Core',
  full_body: 'Full body',
}

function groupHeading(muscleGroup: string) {
  const Icon = MUSCLE_GROUP_ICONS[muscleGroup] ?? CircleDot
  const label = MUSCLE_GROUP_LABELS[muscleGroup] ?? 'Autre'
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="size-3.5" />
      {label}
    </span>
  )
}

// Falls back to the muscle-group icon both when an exercise has no photo
// (most of the catalog, coverage is partial) and when the photo URL fails
// to load — an external image host going down shouldn't leave a broken-image
// icon in the picker.
function ExerciseThumbnail({ exercise }: { exercise: Exercise }) {
  const [failed, setFailed] = useState(false)
  const Icon = MUSCLE_GROUP_ICONS[exercise.muscle_group ?? ''] ?? CircleDot

  if (!exercise.image_url || failed) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
    )
  }

  return (
    <img
      src={exercise.image_url}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-8 shrink-0 rounded object-cover"
    />
  )
}

interface ExercisePickerProps {
  exercises: Exercise[]
  value: string
  onSelect: (exerciseId: string) => void
}

export function ExercisePicker({ exercises, value, onSelect }: ExercisePickerProps) {
  const [search, setSearch] = useState('')

  const filtered = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  const groups = new Map<string, Exercise[]>()
  for (const exercise of filtered) {
    const group = exercise.muscle_group ?? 'autre'
    const existing = groups.get(group)
    if (existing) {
      existing.push(exercise)
    } else {
      groups.set(group, [exercise])
    }
  }

  const selectedExercise = exercises.find((exercise) => exercise.id === value)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {selectedExercise && <ExerciseThumbnail exercise={selectedExercise} />}
        <p>
          Sélection :{' '}
          <span className="text-foreground">{selectedExercise?.name ?? 'aucune'}</span>
        </p>
      </div>
      <Command shouldFilter={false} className="rounded-lg border border-border">
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder="Rechercher un exercice…"
        />
        <CommandList>
          {filtered.length === 0 && <CommandEmpty>Aucun exercice trouvé.</CommandEmpty>}
          {[...groups.entries()].map(([muscleGroup, group]) => (
            <CommandGroup key={muscleGroup} heading={groupHeading(muscleGroup)}>
              {group.map((exercise) => (
                <CommandItem
                  key={exercise.id}
                  value={exercise.id}
                  data-checked={exercise.id === value}
                  onSelect={() => onSelect(exercise.id)}
                  className="gap-2"
                >
                  <ExerciseThumbnail exercise={exercise} />
                  {exercise.name}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup>
            <CommandItem
              value={NEW_EXERCISE_VALUE}
              data-checked={value === NEW_EXERCISE_VALUE}
              onSelect={() => onSelect(NEW_EXERCISE_VALUE)}
            >
              <Plus className="size-4" />
              Créer un nouvel exercice
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
}
