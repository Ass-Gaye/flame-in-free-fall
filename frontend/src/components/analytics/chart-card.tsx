import type { ComponentProps, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface ChartCardProps extends ComponentProps<'div'> {
  title: string
  description: string
  icon: LucideIcon
  isLoading?: boolean
  children: ReactNode
  footerNote?: string
  action?: ReactNode
}

export function ChartCard({
  title,
  description,
  icon: Icon,
  isLoading = false,
  children,
  footerNote,
  action,
  className,
  ...props
}: ChartCardProps) {
  return (
    <Card className={cn('flex flex-col justify-between', className)} {...props}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {action}
            <div
              className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40 text-primary"
              aria-hidden="true"
            >
              <Icon className="size-4" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          children
        )}

        {footerNote ? (
          <p className="border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
            {footerNote}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
