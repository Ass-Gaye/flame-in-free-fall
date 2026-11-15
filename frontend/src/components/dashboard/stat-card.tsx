import type { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value?: string
  hint: string
  icon: LucideIcon
  pending?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  pending = false,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('gap-0 py-0', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <div className="grid size-8 place-items-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          {pending ? (
            <Skeleton className="h-8 w-20" aria-label={`${label} unavailable`} />
          ) : (
            <span className="text-3xl font-semibold tabular-nums tracking-tight">
              {value ?? '—'}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
