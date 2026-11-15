import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-20 w-full rounded-md border border-border/80 bg-secondary/40 px-3 py-2 text-sm text-foreground shadow-2xs outline-none transition-[color,box-shadow,background-color]',
        'placeholder:text-muted-foreground/80 focus:bg-secondary/70',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'resize-none',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
