import { ExternalLink } from '@/components/external-link'
import { doiUrl, stripDoiPrefix } from '@/lib/format'
import { cn } from '@/lib/utils'

interface DoiLinkProps {
  doi: string | null | undefined
  className?: string
}

/**
 * Renders a publication DOI. Investigation DOIs use their own field and link
 * helper; this component is only for publication entries.
 */
export function DoiLink({ doi, className }: DoiLinkProps) {
  const bare = stripDoiPrefix(doi)
  const href = doiUrl(doi)

  if (!bare || !href) {
    return null
  }

  return (
    <ExternalLink
      href={href}
      showIcon={false}
      className={cn('font-mono text-[11px] text-muted-foreground', className)}
      title={`Open DOI ${bare}`}
    >
      {bare}
    </ExternalLink>
  )
}
