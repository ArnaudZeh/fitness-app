import { Link, useLocation, useNavigate } from 'react-router'
import { motion, type PanInfo } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Minimum horizontal travel before a pan on the bar commits to switching
// tabs — small pans (most taps drift a few px) must NOT navigate, only a
// deliberate swipe should.
const SWIPE_THRESHOLD_PX = 48

export interface NavItem {
  name: string
  url: string
  icon: LucideIcon
  // Falls back to `name` — set this when the visible pill label is
  // shortened for space but the accessible name should stay descriptive.
  ariaLabel?: string
  // Small count dot rendered on the icon's corner (e.g. pending friend
  // requests) — omitted or 0 renders nothing.
  badgeCount?: number
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

// Adapted from a Next.js reference component: react-router's <Link> instead
// of next/link, and the active tab is derived from the real current route
// (useLocation) rather than local click-tracked state — the original's
// approach would show the wrong tab active after a reload or a deep link,
// since nothing re-syncs it to the actual page. Mobile stacks icon above
// label across equal-width full-bar columns (classic bottom-tab-bar
// layout, needed once every item shows its label — side-by-side icon+text
// for 6 items doesn't fit a phone width); desktop keeps the original
// pill with icon and label side by side.
export function NavBar({ items, className }: NavBarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  // Swipe across the bar itself to move to the adjacent tab — only from one
  // of the 5 top-level tabs (a sub-route like /programs/:id has no obvious
  // "adjacent" tab, so swiping there is simply a no-op rather than guessing).
  function handlePanEnd(_event: PointerEvent, info: PanInfo) {
    if (
      Math.abs(info.offset.x) < SWIPE_THRESHOLD_PX ||
      Math.abs(info.offset.x) < Math.abs(info.offset.y)
    )
      return

    const currentIndex = items.findIndex((item) => item.url === location.pathname)
    if (currentIndex === -1) return

    const nextIndex = info.offset.x < 0 ? currentIndex + 1 : currentIndex - 1
    const nextItem = items[nextIndex]
    if (!nextItem) return
    void navigate(nextItem.url)
  }

  return (
    <motion.div
      onPanEnd={handlePanEnd}
      className={cn(
        'glass-nav flex w-full items-stretch gap-0.5 rounded-2xl border border-white/10 p-1 sm:w-auto sm:items-center sm:gap-1 sm:rounded-full',
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.url

        return (
          <Link
            key={item.name}
            to={item.url}
            aria-label={item.ariaLabel ?? item.name}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs leading-tight font-medium text-foreground/70 transition-[color,transform] duration-150 ease-out active:scale-90',
              'sm:flex-none sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:py-2 sm:text-sm sm:leading-normal',
              'hover:text-primary',
              isActive && 'text-primary',
            )}
          >
            <span className="relative inline-flex">
              <Icon size={20} strokeWidth={2.25} className="sm:size-4" />
              {!!item.badgeCount && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                  {item.badgeCount > 9 ? '9+' : item.badgeCount}
                </span>
              )}
            </span>
            <span className="max-w-full truncate">{item.name}</span>
            {isActive && (
              <motion.div
                layoutId="tubelight-active"
                className="glass-active-pill absolute inset-0 -z-10 rounded-xl sm:rounded-full"
                initial={false}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              >
                <div className="absolute -top-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-b-full bg-primary">
                  <div className="absolute -top-2 -left-2 h-6 w-10 rounded-full bg-primary/20 blur-md" />
                </div>
              </motion.div>
            )}
          </Link>
        )
      })}
    </motion.div>
  )
}
