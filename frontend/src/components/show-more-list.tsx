import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { formatCount, pluralize } from '@/lib/format'

interface ShowMoreListProps {
  total: number
  initial?: number
  itemLabel?: string
  children: (limit: number) => ReactNode
}

/**
 * Long lists (one investigation has 89 publications) stay scannable without
 * hiding the fact that more entries exist.
 */
export function ShowMoreList({
  total,
  initial = 10,
  itemLabel = 'entry',
  children,
}: ShowMoreListProps) {
  const [expanded, setExpanded] = useState(false)
  const limit = expanded ? total : initial

  return (
    <div>
      {children(limit)}
      {total > initial ? (
        <div className="border-t border-border/60 px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronUp aria-hidden="true" />
            ) : (
              <ChevronDown aria-hidden="true" />
            )}
            {expanded
              ? `Show first ${formatCount(initial)}`
              : `Show all ${formatCount(total)} ${pluralize(total, itemLabel)}`}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
