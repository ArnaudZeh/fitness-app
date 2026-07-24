import { useState } from 'react'
import {
  Activity,
  BicepsFlexed,
  CircleDot,
  Dumbbell,
  Footprints,
  type LucideIcon,
  PersonStanding,
  Shirt,
  Target,
} from 'lucide-react'

export const MUSCLE_GROUP_ICONS: Record<string, LucideIcon> = {
  pectoraux: Dumbbell,
  dos: Shirt,
  épaules: PersonStanding,
  bras: BicepsFlexed,
  jambes: Footprints,
  core: Target,
  full_body: Activity,
}

// Falls back to the muscle-group icon both when an exercise has no photo
// (coverage of the catalog is partial) and when the photo URL fails to
// load — an external image host going down shouldn't leave a broken-image
// icon anywhere in the app.
export function ExerciseThumbnail({
  imageUrl,
  muscleGroup,
}: {
  imageUrl: string | null
  muscleGroup: string | null
}) {
  const [failed, setFailed] = useState(false)
  const Icon = MUSCLE_GROUP_ICONS[muscleGroup ?? ''] ?? CircleDot

  if (!imageUrl || failed) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
    )
  }

  return (
    <img
      src={imageUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-8 shrink-0 rounded object-cover"
    />
  )
}
