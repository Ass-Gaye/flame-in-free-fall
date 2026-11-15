import { Database } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

import { Logo } from '@/components/brand/logo'
import { useDatasetStatus } from '@/lib/dataset-status'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { navSections } from '@/lib/navigation'

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const status = useDatasetStatus()

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Brand header */}
        <div className="flex h-14 items-center border-b border-sidebar-border/70 px-4">
          <Logo />
        </div>

        {/* Navigation list */}
        <nav
          aria-label="Main navigation"
          className="space-y-5 px-2.5 py-4"
        >
          {navSections.map((section) => (
            <div key={section.label} className="space-y-1">
              <p className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors',
                            'focus-visible:ring-2 focus-visible:ring-ring/40',
                            isActive
                              ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/15'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={cn(
                                'size-4 shrink-0 transition-colors',
                                isActive
                                  ? 'text-primary'
                                  : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground',
                              )}
                              aria-hidden="true"
                            />
                            <span className="truncate">{item.label}</span>
                            {isActive ? (
                              <span
                                aria-hidden="true"
                                className="absolute inset-y-1.5 right-1.5 w-1 rounded-full bg-primary"
                              />
                            ) : null}
                          </>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer status widget */}
      <div className="border-t border-sidebar-border/70 p-3">
        <Link
          to="/settings"
          className="group block rounded-lg border border-sidebar-border/80 bg-sidebar-accent/40 p-2.5 transition-colors hover:border-border hover:bg-sidebar-accent"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-sidebar-foreground">
              <Database className="size-3 text-primary" aria-hidden="true" />
              PSI Dataset
            </span>
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  status.state === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : status.state === 'offline'
                      ? 'bg-amber-500'
                      : 'bg-muted-foreground/40',
                )}
                aria-hidden="true"
              />
              <span className="font-mono text-[10px] text-muted-foreground">
                {status.state === 'connected' ? 'LIVE' : status.state === 'offline' ? 'OFFLINE' : 'INIT'}
              </span>
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10.5px] text-muted-foreground">
            <span>{status.state === 'connected' ? `${formatCount(status.investigationsLoaded)} records` : 'Unavailable'}</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/75">
              {status.dataset?.dataset_sha256 ? `${status.dataset.dataset_sha256.slice(0, 7)}` : 'sha-256'}
            </span>
          </div>
        </Link>
      </div>
    </div>
  )
}

export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
      <SidebarNav />
    </aside>
  )
}
