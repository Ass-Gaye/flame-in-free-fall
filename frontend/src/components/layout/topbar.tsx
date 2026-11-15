import { ExternalLink, Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu aria-hidden="true" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <span className="hidden text-muted-foreground sm:inline">Workspace</span>
        <span aria-hidden="true" className="hidden text-muted-foreground/50 sm:inline">
          /
        </span>
        <span className="truncate font-medium">{title}</span>
      </div>

      <Badge
        variant={
          status.state === 'connected'
            ? 'success'
            : status.state === 'offline'
              ? 'warning'
              : 'muted'
        }
        className="hidden md:inline-flex"
      >
        {status.state === 'connected'
          ? `${formatCount(status.investigationsLoaded) ?? '—'} records · live`
          : status.state === 'offline'
            ? 'API offline'
            : 'Connecting…'}
      </Badge>
      <ThemeToggle />
      <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
        <a href="https://psi.nasa.gov" target="_blank" rel="noreferrer">
          NASA PSI
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </Button>
      <Link
        to="/settings"
        className="hidden rounded-md px-2 py-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:inline"
      >
        About this build
      </Link>
    </header>
  )
}
