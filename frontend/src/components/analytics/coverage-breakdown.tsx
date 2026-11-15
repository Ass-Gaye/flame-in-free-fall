import { CheckCircle2, FileText, Database, BookOpen, FileCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ChartCard } from './chart-card'
import { formatCount, formatShare, sharePercent } from '@/lib/format'
import type { StatisticsResponse } from '@/types/api'

interface CoverageBreakdownProps {
  stats: StatisticsResponse
  isLoading?: boolean
}

export function CoverageBreakdown({
  stats,
  isLoading = false,
}: CoverageBreakdownProps) {
  const total = stats.totals.investigations || 133

  const items = [
    {
      title: 'Investigation DOIs',
      description: 'Records with a verified NASA PSI investigation DOI.',
      present: stats.coverage.with_investigation_doi,
      missing: stats.coverage.without_investigation_doi,
      missingNote: 'Unrecorded: PSI-165, PSI-168',
      icon: CheckCircle2,
      presentColor: 'bg-emerald-500',
    },
    {
      title: 'Associated Publications',
      description: 'Records linked to peer-reviewed scientific literature.',
      present: stats.coverage.with_publications,
      missing: stats.coverage.without_publications,
      missingNote: '11 records lack recorded publication entries',
      icon: BookOpen,
      presentColor: 'bg-primary',
    },
    {
      title: 'Extraction Completeness',
      description: 'Investigation records fully parsed vs partially truncated.',
      present:
        stats.by_extraction_status.find((s) => s.value === 'success')?.count ??
        129,
      missing:
        stats.by_extraction_status.find((s) => s.value === 'incomplete')?.count ??
        4,
      missingNote: 'Incomplete: PSI-34, PSI-165, PSI-168, PSI-184',
      icon: FileCheck,
      presentColor: 'bg-blue-500',
    },
    {
      title: 'Hardware & Facility Documents',
      description: 'Records carrying downloadable hardware specifications and facility user guides.',
      present: stats.coverage.with_documents,
      missing: stats.coverage.without_documents,
      missingNote: '105 records have no attached hardware specification links (30 total document entries across 28 records)',
      icon: FileText,
      presentColor: 'bg-amber-500',
    },
    {
      title: 'ISA-Tab Metadata Archives',
      description: 'Enriched from raw ISA-Tab archives with full methodology.',
      present: stats.totals.source_archives || 22,
      missing: total - (stats.totals.source_archives || 22),
      missingNote: '111 records derived from detail-page scrape only',
      icon: Database,
      presentColor: 'bg-purple-500',
    },
  ]

  return (
    <ChartCard
      title="Completeness & Provenance Coverage"
      description="Data availability metrics across DOIs, publications, documents, and extraction status."
      icon={FileCheck}
      isLoading={isLoading}
      footerNote="Document entries represent hardware descriptions and instrument specifications, not raw experimental sensor telemetry. Unrecorded fields indicate uncollected or unlinked PSI records, not proof that NASA possesses no data."
    >
      <div className="space-y-4">
        {items.map((item) => {
          const presentPct = sharePercent(item.present, total)
          const shareText = formatShare(item.present, total)

          return (
            <div key={item.title} className="space-y-1.5 rounded-lg border p-3 bg-muted/20">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <item.icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs font-semibold text-foreground">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold tabular-nums text-foreground">
                    {formatCount(item.present)} / {formatCount(total)}
                  </span>
                  <span className="block text-[10px] text-muted-foreground tabular-nums">
                    {shareText}
                  </span>
                </div>
              </div>

              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted/80 p-0.5"
                role="img"
                aria-label={`${item.title}: ${formatCount(item.present)} present, ${formatCount(item.missing)} missing`}
              >
                <div
                  className={`h-full rounded-full transition-all ${item.presentColor}`}
                  style={{ width: `${presentPct}%` }}
                />
              </div>

              {item.missing > 0 ? (
                <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground">
                  <span>{item.missingNote}</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400">
                    {item.missing} missing ({formatShare(item.missing, total)})
                  </span>
                </div>
              ) : null}
            </div>
          )
        })}

        <div className="rounded-lg border border-border/70 bg-card p-3 text-xs space-y-2">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <BookOpen className="size-3.5 text-primary" aria-hidden="true" />
            Publication Granularity Details
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
            <div className="rounded bg-muted/40 p-2">
              <span className="text-sm font-bold block text-foreground tabular-nums">
                {formatCount(stats.publications.entries)}
              </span>
              <span className="text-[10px] text-muted-foreground">Total Entries</span>
            </div>
            <div className="rounded bg-muted/40 p-2">
              <span className="text-sm font-bold block text-foreground tabular-nums">
                {formatCount(stats.publications.distinct_labels)}
              </span>
              <span className="text-[10px] text-muted-foreground">Distinct Titles</span>
            </div>
            <div className="rounded bg-muted/40 p-2">
              <span className="text-sm font-bold block text-foreground tabular-nums">
                {formatCount(stats.publications.with_doi)}
              </span>
              <span className="text-[10px] text-muted-foreground">Entries with DOI</span>
            </div>
            <div className="rounded bg-muted/40 p-2">
              <span className="text-sm font-bold block text-foreground tabular-nums">
                {formatCount(stats.publications.distinct_dois)}
              </span>
              <span className="text-[10px] text-muted-foreground">Distinct DOIs</span>
            </div>
          </div>
          <div className="pt-1 text-right">
            <Link
              to="/library"
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Browse research library →
            </Link>
          </div>
        </div>
      </div>
    </ChartCard>
  )
}
