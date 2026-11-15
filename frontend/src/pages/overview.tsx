import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Database,
  FlaskConical,
  Info,
  Layers,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { ErrorState } from '@/components/states/error-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
    title: 'Investigations',
    description:
      'Search, filter, and inspect the cleaned NASA PSI records, including objectives, approach, and relevance evidence.',
    to: '/investigations',
    icon: FlaskConical,
  },
  {
    title: 'Research Analytics',
    description:
      'Distributions, publication coverage, and evidence-based observations arrive with the Phase 4 analytics work.',
    to: '/analytics',
    icon: BarChart3,
  },
  {
    title: 'Research Library',
    description:
      'Browse publications and available documents, with investigation DOIs kept separate from paper DOIs.',
    to: '/library',
    icon: BookOpen,
  },
  {
    title: 'AI Research Assistant',
    description:
      'Ask grounded questions once retrieval and the local Ollama model are connected in a later phase.',
    to: '/assistant',
    icon: Sparkles,
  },
]

const pipeline = [
  ['Collect', 'Playwright scraper captures the NASA PSI listing and detail pages.'],
  ['Enrich', 'ISA-Tab archives supply full objectives, approach, and publications.'],
  ['Normalize', 'DOIs, sections, and publications are repaired deterministically.'],
  ['Classify', 'Rule-based labels record direct, supporting, or peripheral evidence.'],
  ['Validate', 'A gate checks counts, identifiers, provenance, and CSV/JSON parity.'],
]

const relevanceBarStyles: Record<RelevanceCategory, string> = {
  direct: 'bg-primary',
  supporting: 'bg-amber-500',
  peripheral: 'bg-muted-foreground/40',
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
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">
          {isRelevanceCategory(entry.value)
            ? relevanceLabels[entry.value]
            : entry.value}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {formatCount(entry.count)} · {shareLabel ?? '—'}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${entry.value}: ${formatCount(entry.count)} of ${formatCount(total)} records (${shareLabel ?? 'share unavailable'})`}
      >
        <div
          className={cn('h-full rounded-full', barClassName)}
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
          missingLabel: 'without a recorded DOI',
        },
        {
          label: 'Publications',
          present: data.coverage.with_publications,
          missing: data.coverage.without_publications,
          missingLabel: 'without publication entries',
        },
        {
          label: 'Documents',
          present: data.coverage.with_documents,
          missing: data.coverage.without_documents,
          missingLabel: 'without recorded files',
        },
      ]
    : []

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Research overview"
        title="A clearer view of microgravity combustion research"
        description="Flame in Freefall is a research intelligence workspace for NASA's Physical Sciences Informatics investigations. Every figure on this page is returned by the read-only API over the cleaned 133-record dataset."
        actions={
          <>
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
                ? `${formatCount(status.investigationsLoaded) ?? '—'} records · live`
                : status.state === 'offline'
                  ? 'API offline'
                  : 'Connecting…'}
            </Badge>
            <Badge variant="outline">Phase 3 · live data</Badge>
          </>
        }
      />

      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Source of every number on this page</AlertTitle>
        <AlertDescription>
          Counts and coverage come from{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[0.8em]">
            GET /api/statistics
          </code>{' '}
          and the dataset fingerprint from{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[0.8em]">
            GET /api/health
          </code>
          . Missing values are labelled as unavailable, never estimated.
        </AlertDescription>
      </Alert>

      {error ? (
        <Card>
          <CardContent className="p-0">
            <ErrorState
              title="Statistics could not be loaded"
              description={`${error.message} Start the read-only API, then retry.`}
              onRetry={retry}
            />
          </CardContent>
        </Card>
      ) : null}

      <section aria-labelledby="collection-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="collection-heading" className="text-lg font-semibold tracking-tight">
              Collection snapshot
            </h2>
            <p className="text-sm text-muted-foreground">
              {isFetching && !isLoading
                ? 'Refreshing statistics…'
                : 'Counts as ingested, without deduplication or estimation.'}
            </p>
          </div>
          <Database className="size-5 text-muted-foreground/60" aria-hidden="true" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total investigations"
            value={data ? formatCount(records) ?? undefined : undefined}
            hint="Records imported from the cleaned NASA PSI dataset."
            icon={Database}
            pending={isLoading}
          />
          <StatCard
            label="Direct relevance"
            value={data ? formatCount(direct) ?? undefined : undefined}
            hint={`Title-level fire-safety evidence. ${data ? formatCount(data.by_relevance.find((entry) => entry.value === 'supporting')?.count ?? 0) : '—'} supporting and ${data ? formatCount(data.by_relevance.find((entry) => entry.value === 'peripheral')?.count ?? 0) : '—'} peripheral.`}
            icon={ShieldCheck}
            pending={isLoading}
          />
          <StatCard
            label="Research areas"
            value={data ? formatCount(data.totals.research_areas) ?? undefined : undefined}
            hint="Distinct NASA research areas represented in the collection."
            icon={Layers}
            pending={isLoading}
          />
          <StatCard
            label="Publication entries"
            value={data ? formatCount(data.totals.publications) ?? undefined : undefined}
            hint={
              data
                ? `${formatCount(data.publications.with_doi)} entries carry a DOI (${formatCount(data.publications.distinct_dois)} distinct). ${formatCount(data.publications.distinct_labels)} distinct normalized titles in total.`
                : 'Entry and DOI counts load with the statistics.'
            }
            icon={BookOpen}
            pending={isLoading}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Relevance distribution
            </CardTitle>
            <CardDescription>
              Rule-based prioritisation, not a scientific quality ranking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data ? (
              <ul className="space-y-4">
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
              <p className="text-sm text-muted-foreground">
                Loading distribution…
              </p>
            )}
            <p className="mt-4 border-t border-border/70 pt-3 text-xs leading-relaxed text-muted-foreground">
              Percentages are computed from the returned counts. Every label stores
              the matched phrases and the rule that fired.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" aria-hidden="true" />
              Research areas
            </CardTitle>
            <CardDescription>
              Investigations per NASA research area, ordered by count.
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
                    barClassName="bg-primary/70"
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Loading research areas…
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="size-4 text-primary" aria-hidden="true" />
              Coverage and gaps
            </CardTitle>
            <CardDescription>
              What the cleaned records do and do not contain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data ? (
              <dl className="divide-y divide-border/60">
                {coverageRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-4 py-2.5"
                  >
                    <dt className="text-sm font-medium">{row.label}</dt>
                    <dd className="text-right text-sm">
                      <span className="tabular-nums">
                        {formatCount(row.present)} of {formatCount(records)}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {formatCount(row.missing)} {row.missingLabel}
                      </span>
                    </dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-sm font-medium">Source archives</dt>
                  <dd className="text-right text-sm">
                    <span className="tabular-nums">
                      {formatCount(data.totals.source_archives)}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      ISA-Tab bundles, each covering one or more studies
                    </span>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Loading coverage…</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-4 text-primary" aria-hidden="true" />
              Dataset provenance
            </CardTitle>
            <CardDescription>
              The source JSON is never edited by the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Source file
              </p>
              <p className="break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                nasa-fire-data/psi_output/merged_master_dataset.json
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                SHA-256
              </p>
              <p
                className="break-all font-mono text-[11px] leading-relaxed"
                title={status.dataset?.dataset_sha256 ?? undefined}
              >
                {datasetHash ?? 'Unavailable until the API responds'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{status.dataset ? `${formatCount(status.dataset.record_count) ?? '—'} records` : 'Record count unavailable'}</span>
              <span aria-hidden="true">·</span>
              <span>{ingestedAt ? `Ingested ${ingestedAt}` : 'Ingestion time unavailable'}</span>
            </div>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Connection details
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="modules-heading" className="space-y-4">
        <div>
          <h2 id="modules-heading" className="text-lg font-semibold tracking-tight">
            Explore the workspace
          </h2>
          <p className="text-sm text-muted-foreground">
            The explorer, record pages, and library are connected to the API.
            Analytics and the assistant describe their later phases honestly.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <Link
                key={module.to}
                to={module.to}
                className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <Card className="h-full gap-4 py-0 transition-colors group-hover:border-primary/40 group-hover:bg-card/80">
                  <CardContent className="flex flex-col gap-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="grid size-10 place-items-center rounded-lg border border-border/70 bg-muted/40 text-primary">
                        <Icon className="size-5" aria-hidden="true" />
                      </div>
                      <ArrowRight
                        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-semibold tracking-tight">{module.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {module.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              How relevance is assigned
            </CardTitle>
            <CardDescription>
              A transparent, rule-based prioritisation aid — not a scientific
              quality judgment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="space-y-1">
                <dt className="text-sm font-medium">Direct</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">
                  The title names explicit fire-safety work, such as spacecraft
                  fire safety, flame spread, burning and suppression,
                  extinguishment, or a smoke/aerosol measurement experiment.
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm font-medium">Supporting</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">
                  The investigation is in Combustion Science, but its title does
                  not name fire-safety work explicitly.
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm font-medium">Peripheral</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">
                  The curated fields do not establish a clear combustion or
                  fire-safety connection.
                </dd>
              </div>
            </dl>
            <p className="mt-5 border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">
              Every label stores the matched phrases and the rule that fired.
              The score is a prioritisation heuristic, never evidence of
              scientific importance.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-4 text-primary" aria-hidden="true" />
              Reproducible data pipeline
            </CardTitle>
            <CardDescription>
              The source dataset is never edited by hand or by the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {pipeline.map(([step, detail], index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border/70 bg-muted/40 font-mono text-[10px] text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{step}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 border-t border-border/70 pt-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
              nasa-fire-data/psi_output/merged_master_dataset.json
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
