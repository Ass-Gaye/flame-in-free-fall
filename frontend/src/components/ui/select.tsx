import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          'flex h-9 w-full appearance-none rounded-md border border-border/80 bg-secondary/40 pl-2.5 pr-8 text-sm text-foreground shadow-2xs outline-none transition-[color,box-shadow,background-color] focus:bg-secondary/70',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  )
}

export { Select }
