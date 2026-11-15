import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Database,
  FlaskConical,
  Layers,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { ErrorState } from '@/components/states/error-state'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useApiQuery } from '@/lib/api-hooks'
import { getStatistics } from '@/lib/api'
import { useDatasetStatus } from '@/lib/dataset-status'
import {
  formatCount,
  formatShare,
  formatTimestamp,
  relevanceLabels,
  sharePercent,
  shortHash,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CountEntry } from '@/types/api'
import type { RelevanceCategory } from '@/types/investigation'

const modules = [
  {
    title: 'Investigations Explorer',
    description:
      'Search, filter, and inspect the 133 cleaned NASA PSI records, including research objectives, experimental approaches, and relevance evidence.',
    to: '/investigations',
    icon: FlaskConical,
    tag: '133 Records',
  },
  {
    title: 'Research Analytics',
    description:
      'Empirical distributions, publication coverage metrics, combustion science themes, and structured gap analysis.',
    to: '/analytics',
    icon: BarChart3,
    tag: 'Empirical Metrics',
  },
  {
    title: 'Research Library',
    description:
      'Explore linked publications and documentation with explicit separation between study and paper DOIs.',
    to: '/library',
    icon: BookOpen,
    tag: '1,786 Publications',
  },
  {
    title: 'AI Research Assistant',
    description:
      'Query the collection with strict evidence retrieval grounding and verifiable citation tracing.',
    to: '/assistant',
    icon: Sparkles,
    tag: 'Dual-Provider RAG',
  },
]

const pipeline = [
  ['Collect', 'Automated headless scraper extracts raw NASA PSI index records and detail dossiers.'],
  ['Enrich', 'ISA-Tab archives supply full experimental objectives, scientific approaches, and publications.'],
  ['Normalize', 'DOIs, study sections, and publication citations are repaired deterministically.'],
  ['Classify', 'Transparent rules assign direct fire safety, supporting combustion, or peripheral evidence.'],
  ['Validate', 'Strict integrity gates verify counts, identifiers, SHA-256 signatures, and format parity.'],
]

const relevanceBarStyles: Record<RelevanceCategory, string> = {
  direct: 'bg-primary',
  supporting: 'bg-amber-500',
  peripheral: 'bg-muted-foreground/50',
}

function isRelevanceCategory(value: string): value is RelevanceCategory {
  return value === 'direct' || value === 'supporting' || value === 'peripheral'
}

function DistributionRow({
  entry,
  total,
  barClassName,
}: {
  entry: CountEntry
  total: number
  barClassName: string
}) {
  const share = sharePercent(entry.count, total)
  const shareLabel = formatShare(entry.count, total)

  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">
          {isRelevanceCategory(entry.value)
            ? relevanceLabels[entry.value]
            : entry.value}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatCount(entry.count)} <span className="text-muted-foreground/50">·</span> {shareLabel ?? '—'}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted/60"
        role="img"
        aria-label={`${entry.value}: ${formatCount(entry.count)} of ${formatCount(total)} records (${shareLabel ?? 'share unavailable'})`}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', barClassName)}
          style={{ width: `${share}%` }}
        />
      </div>
    </li>
  )
}

export function OverviewPage() {
  const { data, error, isLoading, isFetching, retry } = useApiQuery(
    'statistics',
    (signal) => getStatistics({ signal }),
  )
  const status = useDatasetStatus()

  const records = data?.totals.investigations ?? 0
  const direct =
    data?.by_relevance.find((entry) => entry.value === 'direct')?.count ?? 0
  const datasetHash = shortHash(status.dataset?.dataset_sha256)
  const ingestedAt = formatTimestamp(status.dataset?.ingested_at)

  const coverageRows = data
    ? [
        {
          label: 'Investigation DOI',
          present: data.coverage.with_investigation_doi,
          missing: data.coverage.without_investigation_doi,
          missingLabel: 'unrecorded',
        },
        {
          label: 'Publications',
          present: data.coverage.with_publications,
          missing: data.coverage.without_publications,
          missingLabel: 'unrecorded',
        },
        {
          label: 'Documents',
          present: data.coverage.with_documents,
          missing: data.coverage.without_documents,
          missingLabel: 'unrecorded',
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intelligence Overview"
        title="NASA Microgravity Combustion Research"
        description="A research workspace over 133 cleaned NASA Physical Sciences Informatics investigations. All metrics are computed dynamically by the read-only API from the verified dataset."
        actions={
          <div className="flex items-center gap-2">
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
                ? `${formatCount(status.investigationsLoaded) ?? '—'} records online`
                : status.state === 'offline'
                  ? 'API offline'
                  : 'Connecting…'}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10.5px]">
              SHA-256: {datasetHash ?? 'VERIFYING'}
            </Badge>
          </div>
        }
      />

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-0">
            <ErrorState
              title="Statistics could not be loaded"
              description={`${error.message}. Ensure the backend service is running on port 3001, then retry.`}
              onRetry={retry}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Snapshot KPI Grid */}
      <section aria-labelledby="collection-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="collection-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Collection Overview
          </h2>
          <span className="font-mono text-[10.5px] text-muted-foreground">
            {isFetching && !isLoading ? 'Updating…' : 'Verified Dataset'}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total investigations"
            value={data ? formatCount(records) ?? undefined : undefined}
            hint="Validated records imported from NASA PSI."
            icon={Database}
            pending={isLoading}
          />
          <StatCard
            label="Direct Fire Safety"
            value={data ? formatCount(direct) ?? undefined : undefined}
            hint={`Explicit flame spread and safety. ${data ? formatCount(data.by_relevance.find((entry) => entry.value === 'supporting')?.count ?? 0) : '—'} supporting studies.`}
            icon={ShieldCheck}
            pending={isLoading}
          />
          <StatCard
            label="Research Areas"
            value={data ? formatCount(data.totals.research_areas) ?? undefined : undefined}
            hint="NASA physical sciences disciplines represented."
            icon={Layers}
            pending={isLoading}
          />
          <StatCard
            label="Publication Entries"
            value={data ? formatCount(data.totals.publications) ?? undefined : undefined}
            hint={
              data
                ? `${formatCount(data.publications.with_doi)} indexed with persistent DOIs.`
                : 'Citation entries across all records.'
            }
            icon={BookOpen}
            pending={isLoading}
          />
        </div>
      </section>

      {/* Relevance & Research Area Distributions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                Relevance Prioritisation
              </CardTitle>
              <span className="font-mono text-[11px] text-muted-foreground">
                3 Tiers
              </span>
            </div>
            <CardDescription>
              Objective, rule-based classification aiding literature prioritization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data ? (
              <ul className="space-y-3.5">
                {data.by_relevance.map((entry) => (
                  <DistributionRow
                    key={entry.value}
                    entry={entry}
                    total={records}
                    barClassName={
                      isRelevanceCategory(entry.value)
                        ? relevanceBarStyles[entry.value]
                        : 'bg-primary'
                    }
                  />
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Loading relevance distribution…
              </p>
            )}
            <div className="mt-4 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
              Direct relevance indicates explicit spacecraft fire safety, flame spread, or suppression research.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="size-4 text-primary" aria-hidden="true" />
                Research Disciplines
              </CardTitle>
              <span className="font-mono text-[11px] text-muted-foreground">
                Ordered by Count
              </span>
            </div>
            <CardDescription>
              Distribution of investigations across NASA PSI research areas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data ? (
              <ul className="space-y-3">
                {data.by_research_area.map((entry) => (
                  <DistributionRow
                    key={entry.value}
                    entry={entry}
                    total={records}
                    barClassName="bg-primary/80"
                  />
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Loading research areas…
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coverage & Provenance */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="size-4 text-primary" aria-hidden="true" />
                Data Completeness & Coverage
              </CardTitle>
              <span className="font-mono text-[11px] text-muted-foreground">
                Field Audit
              </span>
            </div>
            <CardDescription>
              Exact field availability across all 133 curated records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data ? (
              <dl className="divide-y divide-border/50 text-xs">
                {coverageRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-2"
                  >
                    <dt className="font-medium text-foreground">{row.label}</dt>
                    <dd className="text-right">
                      <span className="font-mono font-semibold text-foreground">
                        {formatCount(row.present)}
                      </span>
                      <span className="text-muted-foreground">
                        {' '}/ {formatCount(records)} ({formatShare(row.present, records)})
                      </span>
                    </dd>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2">
                  <dt className="font-medium text-foreground">ISA-Tab Archives</dt>
                  <dd className="text-right">
                    <span className="font-mono font-semibold text-foreground">
                      {formatCount(data.totals.source_archives)}
                    </span>
                    <span className="text-muted-foreground"> archives integrated</span>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">Loading coverage statistics…</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Database className="size-4 text-primary" aria-hidden="true" />
              Dataset Provenance
            </CardTitle>
            <CardDescription>
              Cryptographically verified read-only storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Source JSON Fingerprint
              </p>
              <p className="rounded border border-border/60 bg-muted/30 p-1.5 font-mono text-[10.5px] text-foreground">
                {status.dataset?.dataset_sha256 ?? 'Checking SHA-256 signature…'}
              </p>
            </div>
            <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
              <span>{status.dataset ? `${formatCount(status.dataset.record_count)} records verified` : 'Auditing records…'}</span>
              <span>{ingestedAt ? `Ingested: ${ingestedAt}` : ''}</span>
            </div>
            <div className="pt-2">
              <Link
                to="/settings"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-primary hover:underline"
              >
                Inspect configuration & pipeline
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Explorer Modules */}
      <section aria-labelledby="modules-heading" className="space-y-3">
        <div>
          <h2 id="modules-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Research Modules
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <Link
                key={module.to}
                to={module.to}
                className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <Card className="h-full border border-border/70 p-4 transition-all group-hover:border-primary/40 group-hover:bg-secondary/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-primary transition-colors group-hover:bg-primary/10">
                        <Icon className="size-4.5" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {module.title}
                        </h3>
                        <Badge variant="outline" className="mt-0.5 text-[9.5px]">
                          {module.tag}
                        </Badge>
                      </div>
                    </div>
                    <ArrowRight
                      className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {module.description}
                  </p>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Pipeline & Methodology Protocol */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Classification Protocol
            </CardTitle>
            <CardDescription>
              Deterministic rules assigned during data ingestion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1 rounded-lg border border-border/70 bg-secondary/35 p-3">
              <p className="font-semibold text-foreground">Direct Fire Safety</p>
              <p className="leading-relaxed text-muted-foreground">
                Matches explicit fire safety, flame propagation, fuel ignition, combustion extinction, or smoke detection criteria.
              </p>
            </div>
            <div className="space-y-1 rounded-lg border border-border/70 bg-secondary/35 p-3">
              <p className="font-semibold text-foreground">Supporting Combustion</p>
              <p className="leading-relaxed text-muted-foreground">
                Conducts microgravity droplet, gaseous, or solid fuel combustion science without explicit spacecraft fire protection objectives.
              </p>
            </div>
            <div className="space-y-1 rounded-lg border border-border/70 bg-secondary/35 p-3">
              <p className="font-semibold text-foreground">Peripheral Investigations</p>
              <p className="leading-relaxed text-muted-foreground">
                Broader physical science studies (materials, biophysics, fluid mechanics) cataloged within NASA PSI.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Database className="size-4 text-primary" aria-hidden="true" />
              Data Pipeline Traceability
            </CardTitle>
            <CardDescription>
              Fully reproducible 5-stage transformation sequence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2.5 text-xs">
              {pipeline.map(([step, detail], index) => (
                <li key={step} className="flex gap-2.5 items-start">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-border/60 bg-muted/40 font-mono text-[10px] font-medium text-muted-foreground">
                    0{index + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-foreground">{step}: </span>
                    <span className="text-muted-foreground leading-relaxed">{detail}</span>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
