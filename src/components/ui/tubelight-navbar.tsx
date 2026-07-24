import { Link, useLocation } from 'react-router'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NavItem {
  name: string
  url: string
  icon: LucideIcon
  // Falls back to `name` — set this when the visible pill label is
  // shortened for space but the accessible name should stay descriptive.
  ariaLabel?: string
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

// Adapted from a Next.js reference component: react-router's <Link> instead
// of next/link, and the active tab is derived from the real current route
// (useLocation) rather than local click-tracked state — the original's
// approach would show the wrong tab active after a reload or a deep link,
// since nothing re-syncs it to the actual page.
export function NavBar({ items, className }: NavBarProps) {
  const location = useLocation()

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full border border-border bg-background/80 p-1 shadow-lg backdrop-blur-lg',
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
              'relative flex size-11 items-center justify-center rounded-full text-sm font-medium text-foreground/70 transition-colors sm:size-auto sm:gap-2 sm:px-4 sm:py-2',
              'hover:text-primary',
              isActive && 'text-primary',
            )}
          >
            <Icon size={20} strokeWidth={2.25} className="sm:size-4" />
            <span className="hidden sm:inline">{item.name}</span>
            {isActive && (
              <motion.div
                layoutId="tubelight-active"
                className="absolute inset-0 -z-10 rounded-full bg-primary/10"
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
    </div>
  )
}
