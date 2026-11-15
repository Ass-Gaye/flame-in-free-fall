import { ArrowLeft, Compass, LayoutDashboard } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/states/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { navSections } from '@/lib/navigation'

export function NotFoundPage() {
  const { pathname } = useLocation()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="404"
        title="Page not found"
        description="The requested route does not exist in this workspace. Nothing was loaded or inferred."
      />

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0">
          <EmptyState
            icon={Compass}
            title="No matching route"
            description={`No route matches ${pathname}. The workspace has seven sections; pick one below or return to the overview.`}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild size="sm">
                  <Link to="/">
                    <LayoutDashboard aria-hidden="true" />
                    Overview
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/investigations">
                    <ArrowLeft aria-hidden="true" />
                    Investigations
                  </Link>
                </Button>
              </div>
            }
          />
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border/70 bg-card p-5">
        <h2 className="text-sm font-semibold tracking-tight">All sections</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {navSections.flatMap((section) =>
            section.items.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="flex items-center gap-2.5 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground outline-none transition-colors hover:border-primary/35 hover:bg-muted/40 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  >
                    <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              )
            }),
          )}
        </ul>
      </div>
    </div>
  )
}
