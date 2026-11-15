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
        'grid gap-0.5 py-2.5 sm:grid-cols-[10.5rem_1fr] sm:items-start sm:gap-4',
        className,
      )}
    >
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:pt-0.5">
        {label}
      </dt>
      <dd className="break-words text-sm leading-relaxed">
        {empty ? (
          <span className="text-muted-foreground">Not recorded</span>
        ) : (
          children
        )}
      </dd>
    </div>
  )
}
