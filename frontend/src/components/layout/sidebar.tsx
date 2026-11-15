import { Database, Flame } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { Logo } from '@/components/brand/logo'
import { Badge } from '@/components/ui/badge'
import { useDatasetStatus } from '@/lib/dataset-status'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { navSections } from '@/lib/navigation'

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const status = useDatasetStatus()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>

      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
      >
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
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
                          'group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm outline-none transition-colors',
                          'focus-visible:ring-[3px] focus-visible:ring-ring/40',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cn(
                              'size-4 shrink-0',
                              isActive
                                ? 'text-primary'
                                : 'text-muted-foreground group-hover:text-foreground',
                            )}
                            aria-hidden="true"
                          />
                          <span className="truncate">{item.label}</span>
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

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/35 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs font-medium">
              <Database className="size-3.5 text-primary" aria-hidden="true" />
              Dataset
            </span>
            <Badge
              variant={
                status.state === 'connected'
                  ? 'success'
                  : status.state === 'offline'
                    ? 'warning'
                    : 'muted'
              }
            >
              {status.state === 'connected'
                ? `${formatCount(status.investigationsLoaded) ?? '—'} records`
                : status.state === 'offline'
                  ? 'API offline'
                  : 'Connecting…'}
            </Badge>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {status.state === 'connected'
              ? `Read-only SQLite copy of the cleaned dataset. SHA-256 ${status.dataset?.dataset_sha256?.slice(0, 10) ?? 'unavailable'}…`
              : status.state === 'offline'
                ? `The frontend cannot reach ${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api'}. Start the backend to load records.`
                : 'Checking the read-only API connection…'}
          </p>
        </div>
        <p className="mt-3 flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground/70">
          <Flame className="size-3" aria-hidden="true" />
          Built for microgravity combustion research
        </p>
      </div>
    </div>
  )
}

export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
      <SidebarNav />
    </aside>
  )
}
