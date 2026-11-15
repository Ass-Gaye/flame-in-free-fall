import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'

import { ChartCard } from './chart-card'
import { formatCount, formatShare, relevanceLabels } from '@/lib/format'
import type { CountEntry } from '@/types/api'
import type { RelevanceCategory } from '@/types/investigation'

interface RelevanceChartProps {
  data: CountEntry[]
  total: number
  isLoading?: boolean
}

const relevanceColorStyles: Record<
  RelevanceCategory,
  { bar: string; text: string; bg: string; fill: string }
> = {
  direct: {
    bar: 'bg-primary',
    text: 'text-primary',
    bg: 'bg-primary/10 border-primary/25',
    fill: 'var(--primary)',
  },
  supporting: {
    bar: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/25',
    fill: '#f59e0b',
  },
  peripheral: {
    bar: 'bg-muted-foreground/40',
    text: 'text-muted-foreground',
    bg: 'bg-muted/40 border-border',
    fill: 'currentColor',
  },
}

const relevanceDescriptions: Record<RelevanceCategory, string> = {
  direct:
    'Explicit fire safety, flame spread, suppression, extinction, or smoke detection experiments (e.g. SAFFIRE, BASS, FLEX, SAME).',
  supporting:
    'Combustion Science investigations without explicit fire-safety focus (e.g. ACME, SPICE, cool flame analysis).',
  peripheral:
    'Investigations in other disciplines (Materials, Fluids, Biophysics) where no combustion connection was identified in curated fields.',
}

function isRelevanceCategory(value: string): value is RelevanceCategory {
  return value === 'direct' || value === 'supporting' || value === 'peripheral'
}

export function RelevanceChart({
  data,
  total,
  isLoading = false,
}: RelevanceChartProps) {
  const slices = useMemo(() => {
    const result: Array<
      CountEntry & {
        category: RelevanceCategory
        ratio: number
        startAngle: number
        angle: number
      }
    > = []
    let currentAngle = 0
    for (const entry of data) {
      const category = isRelevanceCategory(entry.value)
        ? entry.value
        : ('peripheral' as RelevanceCategory)
      const ratio = total > 0 ? entry.count / total : 0
      const angle = ratio * 360
      result.push({
        ...entry,
        category,
        ratio,
        startAngle: currentAngle,
        angle,
      })
      currentAngle += angle
    }
    return result
  }, [data, total])

  return (
    <ChartCard
      title="Relevance Distribution"
      description="Categorization of investigations by combustion and fire-safety relevance."
      icon={ShieldCheck}
      isLoading={isLoading}
      footerNote="Percentages reflect exact counts. Relevance labels are transparent rule-based aids, not scientific quality judgments."
    >
      <div className="space-y-6">
        {/* Visual Multi-Segment Donut & Summary Bar */}
        <div className="space-y-3">
          <div
            className="flex h-3.5 w-full overflow-hidden rounded-full bg-muted/60 p-0.5"
            role="img"
            aria-label={`Relevance distribution: ${data.map((d) => `${d.value}: ${formatCount(d.count)} (${formatShare(d.count, total)})`).join(', ')}`}
          >
            {data.map((entry) => {
              const cat = isRelevanceCategory(entry.value)
                ? entry.value
                : 'peripheral'
              const percent = total > 0 ? (entry.count / total) * 100 : 0
              if (percent <= 0) return null

              return (
                <div
                  key={entry.value}
                  className={`h-full first:rounded-l-full last:rounded-r-full transition-all ${relevanceColorStyles[cat].bar}`}
                  style={{ width: `${percent}%` }}
                  title={`${relevanceLabels[cat]}: ${formatCount(entry.count)} (${formatShare(entry.count, total)})`}
                />
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            {slices.map((slice) => (
              <div key={slice.value} className="flex items-center gap-1.5">
                <span
                  className={`inline-block size-2 rounded-full ${relevanceColorStyles[slice.category].bar}`}
                  aria-hidden="true"
                />
                <span className="font-medium text-foreground">
                  {relevanceLabels[slice.category]}
                </span>
                <span className="tabular-nums">
                  {formatShare(slice.count, total)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Breakdown Cards */}
        <div className="grid gap-2.5 sm:grid-cols-3">
          {data.map((entry) => {
            const cat = isRelevanceCategory(entry.value)
              ? entry.value
              : 'peripheral'
            const styles = relevanceColorStyles[cat]
            const share = formatShare(entry.count, total)

            return (
              <div
                key={entry.value}
                className={`flex flex-col justify-between rounded-lg border p-3 ${styles.bg}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {relevanceLabels[cat]}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-foreground">
                      {share}
                    </span>
                  </div>
                  <div className="text-xl font-bold tabular-nums tracking-tight">
                    {formatCount(entry.count)}
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {relevanceDescriptions[cat]}
                  </p>
                </div>

                <div className="mt-3 pt-2">
                  <Link
                    to={`/investigations?relevance=${encodeURIComponent(cat)}`}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    View investigations
                    <ArrowRight className="size-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </ChartCard>
  )
}
