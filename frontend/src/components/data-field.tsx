import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface DataFieldProps {
  label: string
  children?: ReactNode
  className?: string
}

/** A definition-list row that labels missing data instead of leaving a gap. */
export function DataField({ label, children, className }: DataFieldProps) {
  const empty =
    children === null ||
    children === undefined ||
    children === false ||
    children === ''

  return (
    <div
      className={cn(
        'grid gap-0.5 py-2 sm:grid-cols-[10rem_1fr] sm:items-start sm:gap-4',
        className,
      )}
    >
      <dt className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground sm:pt-0.5">
        {label}
      </dt>
      <dd className="break-words text-xs leading-relaxed text-foreground">
        {empty ? (
          <span className="font-mono text-[11px] text-muted-foreground/70 italic">Not recorded</span>
        ) : (
          children
        )}
      </dd>
    </div>
  )
}
