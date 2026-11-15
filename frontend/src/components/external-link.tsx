import { ExternalLink as ExternalLinkIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface ExternalLinkProps {
  href: string
  children: ReactNode
  className?: string
  showIcon?: boolean
  title?: string
}

export function ExternalLink({
  href,
  children,
  className,
  showIcon = true,
  title,
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={title}
      className={cn(
        'inline-flex items-center gap-1 underline-offset-4 hover:underline',
        className,
      )}
    >
      {children}
      {showIcon ? (
        <ExternalLinkIcon className="size-3 shrink-0" aria-hidden="true" />
      ) : null}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}
