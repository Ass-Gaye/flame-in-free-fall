import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Pagination } from '@/types/api'

interface PaginationBarProps {
  pagination: Pagination
  onPageChange: (page: number) => void
  itemLabel?: string
  disabled?: boolean
  className?: string
}

export function PaginationBar({
  pagination,
  onPageChange,
  itemLabel = 'records',
  disabled = false,
  className,
}: PaginationBarProps) {
  const { page, page_size: pageSize, total, total_pages: totalPages } = pagination
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border/60 px-4 py-2.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5',
        className,
      )}
    >
      <span aria-live="polite">
        {total === 0
          ? `No ${itemLabel}`
          : `Showing ${formatCount(start)}–${formatCount(end)} of ${formatCount(total)} ${itemLabel}`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <span className="font-mono text-[11px]">
          page {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
