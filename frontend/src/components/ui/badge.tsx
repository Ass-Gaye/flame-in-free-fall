import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors [&>svg]:size-3 [&>svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default:
          'border-primary/20 bg-primary/10 text-primary dark:bg-primary/15 dark:border-primary/30',
        secondary:
          'border-border/80 bg-secondary text-secondary-foreground',
        destructive:
          'border-destructive/20 bg-destructive/10 text-destructive dark:bg-destructive/15 dark:border-destructive/30',
        outline:
          'border-border text-muted-foreground hover:text-foreground',
        muted:
          'border-border/60 bg-muted/40 text-muted-foreground',
        success:
          'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        warning:
          'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        info:
          'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
