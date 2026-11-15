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
    <footer className="mx-auto flex w-full max-w-7xl flex-col gap-2 border-t border-border/60 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <p>Flame in Freefall · NASA combustion research intelligence</p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>{pageTitle(pathname)}</span>
        <span aria-hidden="true">·</span>
        <span>
          {status.state === 'connected'
            ? `Dataset connected · ${formatCount(status.investigationsLoaded) ?? '—'} records · Phase 3`
            : status.state === 'offline'
              ? 'API offline · start the backend to load records'
              : 'Connecting to the read-only API…'}
        </span>
        <Link
          to="/settings"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Build details
        </Link>
      </p>
    </footer>
  )
}

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-svh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[460px] bg-ember-glow" />

      <DesktopSidebar />
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="lg:pl-64">
        <Topbar onOpenNav={() => setMobileOpen(true)} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
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
