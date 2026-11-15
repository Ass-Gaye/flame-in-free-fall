import { Flame } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300 text-[#1b1206] shadow-[0_0_26px_-8px_rgba(249,115,22,0.85)]">
        <Flame className="size-5" strokeWidth={2.2} aria-hidden="true" />
      </div>
      <div className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold tracking-tight">
          Flame in Freefall
        </span>
        <span className="block truncate text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          NASA PSI research
        </span>
      </div>
    </div>
  )
}
