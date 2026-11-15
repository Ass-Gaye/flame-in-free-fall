import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { DesktopSidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Topbar } from '@/components/layout/topbar'
import { DatasetStatusProvider, useDatasetStatus } from '@/lib/dataset-status'
import { formatCount } from '@/lib/format'
import { pageTitle } from '@/lib/navigation'

function ShellFooter() {
  const { pathname } = useLocation()
  const status = useDatasetStatus()

  return (
    <footer className="mt-12 border-t border-border/50 py-5 text-xs text-muted-foreground/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground/80">Flame in Freefall</span>
          <span aria-hidden="true">·</span>
          <span>NASA PSI Microgravity Research</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
          <span>{pageTitle(pathname)}</span>
          <span aria-hidden="true">·</span>
          <span>
            {status.state === 'connected'
              ? `${formatCount(status.investigationsLoaded) ?? '—'} records verified`
              : status.state === 'offline'
                ? 'API offline'
                : 'Connecting…'}
          </span>
          <span aria-hidden="true">·</span>
          <Link
            to="/settings"
            className="text-foreground/70 underline-offset-4 hover:text-foreground hover:underline"
          >
            System Info
          </Link>
        </div>
      </div>
    </footer>
  )
}

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-svh bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-xs focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <DesktopSidebar />
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-h-svh flex-col lg:pl-60">
        <Topbar onOpenNav={() => setMobileOpen(true)} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8"
        >
          <Outlet />
        </main>
        <ShellFooter />
      </div>
    </div>
  )
}

export function AppShell() {
  return (
    <DatasetStatusProvider>
      <Shell />
    </DatasetStatusProvider>
  )
}
