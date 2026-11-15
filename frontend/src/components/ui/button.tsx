import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-medium outline-none transition-[color,background-color,border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.99]',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 active:scale-[0.99]',
        outline:
          'border border-border/80 bg-background/60 shadow-2xs hover:bg-muted/60 hover:text-foreground active:scale-[0.99]',
        secondary:
          'border border-border/60 bg-secondary text-secondary-foreground shadow-2xs hover:bg-secondary/80 active:scale-[0.99]',
        ghost:
          'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        link:
          'text-primary underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-8.5 px-3.5 py-1.5 has-[>svg]:px-3',
        sm: 'h-7.5 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2 text-[11px]',
        lg: 'h-9.5 rounded-lg px-4.5 has-[>svg]:px-3.5 text-sm',
        icon: 'size-8.5 rounded-lg',
        'icon-sm': 'size-7.5 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
