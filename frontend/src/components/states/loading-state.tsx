import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  label?: string
  rows?: number
  className?: string
}

const widths = ['w-2/5', 'w-3/5', 'w-1/2', 'w-4/5', 'w-1/3']

export function LoadingState({
  label = 'Loading data',
  rows = 4,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn('space-y-4 p-6', className)}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className={cn('h-3.5', widths[index % widths.length])} />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
        </div>
      ))}
      <div aria-hidden="true" className="flex items-center gap-4">
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/5" />
        </div>
        <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
      </div>
    </div>
  )
}
