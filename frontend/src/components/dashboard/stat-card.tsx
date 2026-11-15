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
    <Card className={cn('gap-0 py-0 transition-all hover:border-border', className)}>
      <CardContent className="p-4 sm:p-4.5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground">
            <Icon className="size-3.5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          {pending ? (
            <Skeleton className="h-7 w-20" aria-label={`${label} unavailable`} />
          ) : (
            <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {value ?? '—'}
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
