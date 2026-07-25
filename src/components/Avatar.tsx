import { useState } from 'react'
import { cn } from '@/lib/utils'

const SIZE_CLASSES = {
  sm: 'size-8 text-xs',
  md: 'size-12 text-base',
  lg: 'size-20 text-2xl',
} as const

// Falls back to a circle with the first letter of the name, both when
// there's no photo yet and when the signed URL fails to load (e.g. expired).
export function Avatar({
  url,
  displayName,
  size = 'md',
}: {
  url: string | null
  displayName: string
  size?: keyof typeof SIZE_CLASSES
}) {
  const [failed, setFailed] = useState(false)
  const initial = displayName.trim().charAt(0).toUpperCase() || '?'

  if (!url || failed) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground',
          SIZE_CLASSES[size],
        )}
      >
        {initial}
      </span>
    )
  }

  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('shrink-0 rounded-full object-cover', SIZE_CLASSES[size])}
    />
  )
}
