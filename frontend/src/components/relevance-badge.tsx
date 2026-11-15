import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { RelevanceCategory } from '@/types/investigation'

const labels: Record<RelevanceCategory, string> = {
  direct: 'Direct',
  supporting: 'Supporting',
  peripheral: 'Peripheral',
}

const styles: Record<RelevanceCategory, string> = {
  direct:
    'border-primary/25 bg-primary/10 text-primary dark:bg-primary/15 dark:border-primary/30',
  supporting:
    'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:bg-amber-500/15 dark:border-amber-500/30',
  peripheral:
    'border-border/60 bg-muted/40 text-muted-foreground',
}

interface RelevanceBadgeProps {
  category: RelevanceCategory
  score?: number
  reason?: string
  className?: string
}

export function RelevanceBadge({
  category,
  score,
  reason,
  className,
}: RelevanceBadgeProps) {
  const title = [
    `${labels[category]} relevance`,
    typeof score === 'number' ? `score ${score.toFixed(2)}` : null,
    reason ?? null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Badge
      variant="outline"
      title={title}
      className={cn('gap-1.5 font-mono text-[10.5px] font-medium tracking-tight', styles[category], className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full',
          category === 'direct'
            ? 'bg-primary'
            : category === 'supporting'
              ? 'bg-amber-500'
              : 'bg-muted-foreground/60',
        )}
      />
      {labels[category]}
    </Badge>
  )
}
