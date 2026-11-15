import { ExternalLink, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { ThemeToggle } from '@/components/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDatasetStatus } from '@/lib/dataset-status'
import { formatCount } from '@/lib/format'
import { pageTitle } from '@/lib/navigation'

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const { pathname } = useLocation()
  const title = pageTitle(pathname)
  const status = useDatasetStatus()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onOpenNav}
          aria-label="Open navigation"
        >
          <Menu className="size-4" aria-hidden="true" />
        </Button>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-tight text-foreground">
            {title}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Badge
          variant={
            status.state === 'connected'
              ? 'success'
              : status.state === 'offline'
                ? 'warning'
                : 'muted'
          }
          className="hidden sm:inline-flex text-[10.5px]"
        >
          {status.state === 'connected'
            ? `${formatCount(status.investigationsLoaded) ?? '—'} records online`
            : status.state === 'offline'
              ? 'API offline'
              : 'Connecting…'}
        </Badge>

        <ThemeToggle />

        <Button
          variant="outline"
          size="sm"
          asChild
          className="hidden md:inline-flex gap-1.5 text-xs h-7.5"
        >
          <a
            href="https://psi.nasa.gov"
            target="_blank"
            rel="noreferrer"
            aria-label="Visit NASA Physical Sciences Informatics (opens in a new tab)"
          >
            <span>NASA PSI</span>
            <ExternalLink className="size-3 text-muted-foreground" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </header>
  )
}
