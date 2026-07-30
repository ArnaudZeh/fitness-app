import { useState } from 'react'
import { CircleDot, Plus } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { ExerciseThumbnail, MUSCLE_GROUP_ICONS } from '@/components/ExerciseThumbnail'
import { useExerciseUsageCounts } from '@/hooks/useExercises'
import { cn } from '@/lib/utils'
import type { Exercise } from '@/lib/exercises-api'

export const NEW_EXERCISE_VALUE = '__new__'

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  pectoraux: 'Pectoraux',
  dos: 'Dos',
  épaules: 'Épaules',
  bras: 'Bras',
  jambes: 'Jambes',
  core: 'Core',
  full_body: 'Full body',
}

const MUSCLE_GROUP_OPTIONS = Object.keys(MUSCLE_GROUP_LABELS)
const FREQUENT_EXERCISES_LIMIT = 5

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

interface ExercisePickerProps {
  exercises: Exercise[]
  value: string
  onSelect: (exerciseId: string) => void
}

export function ExercisePicker({ exercises, value, onSelect }: ExercisePickerProps) {
  const [search, setSearch] = useState('')
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<string | null>(null)
  const { data: usageCounts } = useExerciseUsageCounts()

  const searchFiltered = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const filtered = muscleGroupFilter
    ? searchFiltered.filter((exercise) => (exercise.muscle_group ?? 'autre') === muscleGroupFilter)
    : searchFiltered

  // Only surfaced before typing a query — once someone's actually
  // searching, relevance to that query matters more than how often they've
  // used something, so this shortcut steps aside for plain results.
  const frequentExercises =
    search.trim() === ''
      ? [...filtered]
          .filter((exercise) => (usageCounts?.get(exercise.id) ?? 0) > 0)
          .sort((a, b) => (usageCounts?.get(b.id) ?? 0) - (usageCounts?.get(a.id) ?? 0))
          .slice(0, FREQUENT_EXERCISES_LIMIT)
      : []
  const frequentIds = new Set(frequentExercises.map((exercise) => exercise.id))

  const groups = new Map<string, Exercise[]>()
  for (const exercise of filtered) {
    if (frequentIds.has(exercise.id)) continue
    const group = exercise.muscle_group ?? 'autre'
    const existing = groups.get(group)
    if (existing) {
      existing.push(exercise)
    } else {
      groups.set(group, [exercise])
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Command shouldFilter={false}>
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder="Rechercher un exercice…"
        />
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-1.5 pb-1">
          <button
            type="button"
            onClick={() => setMuscleGroupFilter(null)}
            className={cn(
              'shrink-0 rounded-full border px-2 py-1 text-xs',
              muscleGroupFilter === null
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground',
            )}
          >
            Tous
          </button>
          {MUSCLE_GROUP_OPTIONS.map((group) => {
            const Icon = MUSCLE_GROUP_ICONS[group] ?? CircleDot
            return (
              <button
                key={group}
                type="button"
                onClick={() =>
                  setMuscleGroupFilter((current) => (current === group ? null : group))
                }
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs',
                  muscleGroupFilter === group
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {MUSCLE_GROUP_LABELS[group]}
              </button>
            )
          })}
        </div>
        <CommandList className="max-h-none flex-1">
          {filtered.length === 0 && <CommandEmpty>Aucun exercice trouvé.</CommandEmpty>}
          {frequentExercises.length > 0 && (
            <>
              <CommandGroup heading="Fréquemment utilisés">
                {frequentExercises.map((exercise) => (
                  <CommandItem
                    key={exercise.id}
                    value={exercise.id}
                    data-checked={exercise.id === value}
                    onSelect={() => onSelect(exercise.id)}
                    className="gap-2"
                  >
                    <ExerciseThumbnail
                      imageUrl={exercise.image_url}
                      muscleGroup={exercise.muscle_group}
                    />
                    {exercise.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
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
                  <ExerciseThumbnail
                    imageUrl={exercise.image_url}
                    muscleGroup={exercise.muscle_group}
                  />
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
