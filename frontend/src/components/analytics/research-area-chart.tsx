import { Link } from 'react-router-dom'
import { ArrowRight, Layers, Rocket, Landmark } from 'lucide-react'

import { ChartCard } from './chart-card'
import { formatCount, formatShare } from '@/lib/format'
import type { CountEntry } from '@/types/api'

interface ResearchAreaChartProps {
  researchAreas: CountEntry[]
  projectTypes?: CountEntry[]
  total: number
  isLoading?: boolean
}

export function ResearchAreaChart({
  researchAreas,
  projectTypes = [],
  total,
  isLoading = false,
}: ResearchAreaChartProps) {
  const sortedAreas = [...researchAreas].sort((a, b) => b.count - a.count)
  const maxAreaCount = sortedAreas.length > 0 ? sortedAreas[0].count : 1

  return (
    <ChartCard
      title="Research Disciplines & Platforms"
      description="Distribution across 6 NASA PSI disciplines and 2 operational project types."
      icon={Layers}
      isLoading={isLoading}
      footerNote="Combustion Science accounts for all 24 direct and supporting fire-behavior investigations. 85.7% of all records represent microgravity spaceflight experiments."
    >
      <div className="space-y-6">
        {/* Research Areas Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>NASA Research Disciplines</span>
            <span>Count · Share</span>
          </div>

          <ul className="space-y-2.5" role="list">
            {sortedAreas.map((item) => {
              const isCombustion = item.value.toLowerCase().includes('combustion')
              const share = formatShare(item.count, total)
              const widthPct = Math.max(Math.round((item.count / maxAreaCount) * 100), 4)

              return (
                <li key={item.value} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <Link
                      to={`/investigations?area=${encodeURIComponent(item.value)}`}
                      className={`font-medium hover:underline inline-flex items-center gap-1.5 ${
                        isCombustion ? 'text-primary font-semibold' : 'text-foreground'
                      }`}
                    >
                      <span>{item.value}</span>
                      {isCombustion ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] text-primary">
                          Focal Domain
                        </span>
                      ) : null}
                    </Link>
                    <span className="tabular-nums text-muted-foreground font-mono">
                      {formatCount(item.count)} ({share ?? '—'})
                    </span>
                  </div>

                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted/60 p-0.5"
                    role="img"
                    aria-label={`${item.value}: ${formatCount(item.count)} investigations (${share ?? 'share unavailable'})`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCombustion
                          ? 'bg-primary'
                          : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Project Types Section (Platform) */}
        {projectTypes.length > 0 ? (
          <div className="space-y-3 border-t border-border/70 pt-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Investigation Project Platform</span>
              <span>Platform Share</span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {projectTypes.map((pt) => {
                const isMicrogravity = pt.value.toLowerCase().includes('microgravity')
                const Icon = isMicrogravity ? Rocket : Landmark
                const share = formatShare(pt.count, total)

                return (
                  <div
                    key={pt.value}
                    className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-7 place-items-center rounded bg-muted/80 text-muted-foreground">
                        <Icon className="size-3.5" aria-hidden="true" />
                      </div>
                      <div>
                        <Link
                          to={`/investigations?project_type=${encodeURIComponent(pt.value)}`}
                          className="text-xs font-medium text-foreground hover:underline block"
                        >
                          {pt.value}
                        </Link>
                        <span className="text-[10px] text-muted-foreground">
                          {isMicrogravity ? 'Spaceflight (ISS, Cygnus)' : 'Ground-based test facilities'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold tabular-nums text-foreground block">
                        {formatCount(pt.count)}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {share}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="pt-1 text-right">
          <Link
            to="/investigations"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Explore all in investigation explorer
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </ChartCard>
  )
}
