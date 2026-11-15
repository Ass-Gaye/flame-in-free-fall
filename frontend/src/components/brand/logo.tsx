import { Flame } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
        <Flame className="size-4" strokeWidth={2.4} aria-hidden="true" />
      </div>
      <div className="min-w-0 leading-none">
        <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
          Flame in Freefall
        </span>
        <span className="mt-1 block truncate font-mono text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
          NASA PSI Intelligence
        </span>
      </div>
    </div>
  )
}
