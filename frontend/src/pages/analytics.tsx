import {
  BookOpen,
  Database,
  FileCheck,
  Flame,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { ErrorState } from '@/components/states/error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useApiQuery } from '@/lib/api-hooks'
import { getStatistics } from '@/lib/api'
import { formatCount } from '@/lib/format'

import { RelevanceChart } from '@/components/analytics/relevance-chart'
import { ResearchAreaChart } from '@/components/analytics/research-area-chart'
import { CoverageBreakdown } from '@/components/analytics/coverage-breakdown'
import { ResearchThemes } from '@/components/analytics/research-themes'
import { ResearchGaps } from '@/components/analytics/research-gaps'

export function AnalyticsPage() {
  const { data, error, isLoading, isFetching, retry } = useApiQuery(
    'statistics',
    (signal) => getStatistics({ signal }),
  )

  const total = data?.totals.investigations ?? 133
  const directCount =
    data?.by_relevance.find((r) => r.value === 'direct')?.count ?? 10
  const combustionCount =
    data?.by_research_area.find((a) => a.value.includes('Combustion'))?.count ?? 24
  const publicationsTotal = data?.totals.publications ?? 1786
  const documentsTotal = data?.totals.documents ?? 30

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Grounded Dataset Provenance"
        title="Research Intelligence & Analytics"
        description="Distributions, publication coverage, combustion themes, and gap analysis across 133 NASA PSI investigations."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={error ? 'destructive' : 'success'}>
              {error ? 'API Offline' : 'Phase 4 · Live Analytics'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={retry}
              disabled={isFetching}
              className="gap-1.5 h-7.5 text-xs"
            >
              <RefreshCw
                className={`size-3 ${isFetching ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-0">
            <ErrorState
              title="Analytics data unavailable"
              description={`${error.message}. Please verify the backend service is running.`}
              onRetry={retry}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Snapshot KPI Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[10px] uppercase font-semibold">Investigations</span>
            <Database className="size-3.5 text-primary" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground tracking-tight">
            {formatCount(total)}
          </div>
          <p className="text-[10.5px] text-muted-foreground">NASA PSI records</p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[10px] uppercase font-semibold">Direct Fire Safety</span>
            <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground tracking-tight">
            {formatCount(directCount)}
          </div>
          <p className="text-[10.5px] text-muted-foreground">Explicit flame & safety</p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[10px] uppercase font-semibold">Combustion Science</span>
            <Flame className="size-3.5 text-primary" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground tracking-tight">
            {formatCount(combustionCount)}
          </div>
          <p className="text-[10.5px] text-muted-foreground">Direct + supporting</p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[10px] uppercase font-semibold">Publications</span>
            <BookOpen className="size-3.5 text-primary" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground tracking-tight">
            {formatCount(publicationsTotal)}
          </div>
          <p className="text-[10.5px] text-muted-foreground">Indexed papers</p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[10px] uppercase font-semibold">Documents</span>
            <FileCheck className="size-3.5 text-primary" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground tracking-tight">
            {formatCount(documentsTotal)}
          </div>
          <p className="text-[10.5px] text-muted-foreground">Across 28 records</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RelevanceChart
          data={data?.by_relevance ?? []}
          total={total}
          isLoading={isLoading}
        />
        <ResearchAreaChart
          researchAreas={data?.by_research_area ?? []}
          projectTypes={data?.by_project_type ?? []}
          total={total}
          isLoading={isLoading}
        />
      </div>

      {/* Completeness & Provenance Coverage */}
      {data ? <CoverageBreakdown stats={data} isLoading={isLoading} /> : null}

      {/* Qualitative Intelligence & Programmatic Themes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ResearchThemes />
        <ResearchGaps />
      </div>

      {/* Scientific Integrity & Interpretation Guardrails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Scientific Integrity & Interpretation Protocol
          </CardTitle>
          <CardDescription>
            Mandatory guidelines governing how observations are derived and
            communicated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-3">
              <span className="font-mono text-primary font-bold">01</span>
              <p className="font-semibold text-foreground">Exact Empirical Counts</p>
              <p className="text-muted-foreground leading-relaxed">
                State what the dataset shows with verifiable numeric relations,
                never generalizing or projecting beyond the ingested sample.
              </p>
            </div>

            <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-3">
              <span className="font-mono text-primary font-bold">02</span>
              <p className="font-semibold text-foreground">Specific Evidence Citations</p>
              <p className="text-muted-foreground leading-relaxed">
                Every programmatic observation links directly to the specific
                NASA PSI investigation IDs that support the finding.
              </p>
            </div>

            <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-3">
              <span className="font-mono text-primary font-bold">03</span>
              <p className="font-semibold text-foreground">Explicit Limitations</p>
              <p className="text-muted-foreground leading-relaxed">
                Acknowledge unrecorded fields, web extraction anomalies, and
                subset boundaries as limitations, never as proof of nonexistence.
              </p>
            </div>

            <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-3">
              <span className="font-mono text-primary font-bold">04</span>
              <p className="font-semibold text-foreground">Possibilities, Not Discoveries</p>
              <p className="text-muted-foreground leading-relaxed">
                Framed as areas for future investigation and data enrichment, not
                as confirmed scientific discoveries.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
