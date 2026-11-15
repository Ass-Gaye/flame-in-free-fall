import {
  ArrowUpDown,
  Filter,
  FlaskConical,
  Search,
  X,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { PaginationBar } from '@/components/pagination-bar'
import { RelevanceBadge } from '@/components/relevance-badge'
import { EmptyState } from '@/components/states/empty-state'
import { ErrorState } from '@/components/states/error-state'
import { LoadingState } from '@/components/states/loading-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { listInvestigations, getFilters } from '@/lib/api'
import { useApiQuery } from '@/lib/api-hooks'
import {
  extractionLabels,
  formatCount,
  pluralize,
  relevanceLabels,
} from '@/lib/format'
import {
  readEnumParam,
  readIntParam,
  readParam,
  useDebouncedSearchParam,
  useUrlQueryState,
} from '@/lib/query-state'
import { cn } from '@/lib/utils'
import type { CountEntry, InvestigationSort } from '@/types/api'
import type {
  ExtractionStatus,
  RelevanceCategory,
} from '@/types/investigation'

const PAGE_SIZE = 25

const relevanceValues: RelevanceCategory[] = [
  'direct',
  'supporting',
  'peripheral',
]

const extractionValues: ExtractionStatus[] = [
  'success',
  'incomplete',
  'failed',
]

const sortOptions = [
  { value: 'relevance', label: 'Relevance (highest first)' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'area', label: 'Research area (A–Z)' },
  { value: 'project_type', label: 'Project type (A–Z)' },
  { value: 'extraction', label: 'Extraction status' },
  { value: 'publications', label: 'Publication count (most first)' },
] as const

const sortValues = sortOptions.map((option) => option.value) as InvestigationSort[]

const sortDirections: Record<InvestigationSort, 'ascending' | 'descending'> = {
  relevance: 'ascending',
  title: 'ascending',
  area: 'ascending',
  project_type: 'ascending',
  extraction: 'ascending',
  publications: 'descending',
}

function filterLabel(entry: CountEntry, key: 'relevance' | 'extraction'): string {
  if (key === 'relevance' && entry.value in relevanceLabels) {
    return relevanceLabels[entry.value as RelevanceCategory]
  }
  if (key === 'extraction' && entry.value in extractionLabels) {
    return extractionLabels[entry.value as ExtractionStatus]
  }
  return entry.value
}

function ExtractionBadge({ status }: { status: ExtractionStatus }) {
  const variant =
    status === 'success'
      ? 'success'
      : status === 'incomplete'
        ? 'warning'
        : 'destructive'

  return (
    <Badge variant={variant} className="text-[10px]">
      {extractionLabels[status] ?? status}
    </Badge>
  )
}

interface SortableHeaderProps {
  label: string
  sortValue: InvestigationSort
  current: InvestigationSort
  onSort: (sort: InvestigationSort) => void
  className?: string
}

function SortableHeader({
  label,
  sortValue,
  current,
  onSort,
  className,
}: SortableHeaderProps) {
  const active = current === sortValue

  return (
    <th
      scope="col"
      aria-sort={active ? sortDirections[sortValue] : 'none'}
      className={cn('px-4 py-3 font-semibold', className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortValue)}
        className={cn(
          'inline-flex items-center gap-1.5 uppercase tracking-[0.12em] outline-none transition-colors focus-visible:text-foreground hover:text-foreground',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        <ArrowUpDown
          className={cn('size-3', active ? 'text-primary' : 'opacity-50')}
          aria-hidden="true"
        />
      </button>
    </th>
  )
}

export function InvestigationsPage() {
  const location = useLocation()
  const { params, update, setPage } = useUrlQueryState()

  const q = readParam(params, 'q')
  const relevanceRaw = readParam(params, 'relevance')
  const relevanceParam = relevanceValues.includes(
    relevanceRaw as RelevanceCategory,
  )
    ? relevanceRaw
    : ''
  const area = readParam(params, 'area')
  const projectType = readParam(params, 'project_type')
  const statusRaw = readParam(params, 'status')
  const statusParam = extractionValues.includes(statusRaw as ExtractionStatus)
    ? statusRaw
    : ''
  const sort = readEnumParam<InvestigationSort>(
    params,
    'sort',
    sortValues,
    'relevance',
  )
  const page = readIntParam(params, 'page', 1)

  const [searchInput, setSearchInput] = useDebouncedSearchParam(
    q,
    (value) => update({ q: value || null }, { replace: true }),
  )

  const filters = useApiQuery('filters', (signal) => getFilters({ signal }))

  const queryKey = [
    'investigations',
    q,
    relevanceParam,
    area,
    projectType,
    statusParam,
    sort,
    page,
  ].join('|')

  const investigations = useApiQuery(
    queryKey,
    (signal) =>
      listInvestigations(
        {
          q: q || undefined,
          relevance: relevanceParam
            ? [relevanceParam as RelevanceCategory]
            : undefined,
          area: area ? [area] : undefined,
          project_type: projectType ? [projectType] : undefined,
          status: statusParam ? [statusParam as ExtractionStatus] : undefined,
          sort,
          page,
          page_size: PAGE_SIZE,
        },
        { signal },
      ),
  )

  const data = investigations.data
  const total = data?.pagination.total ?? 0
  const activeFilters = [
    relevanceParam
      ? {
          key: 'relevance',
          label: `Relevance: ${relevanceLabels[relevanceParam as RelevanceCategory] ?? relevanceParam}`,
        }
      : null,
    area ? { key: 'area', label: `Area: ${area}` } : null,
    projectType ? { key: 'project_type', label: `Type: ${projectType}` } : null,
    statusParam
      ? {
          key: 'status',
          label: `Extraction: ${extractionLabels[statusParam as ExtractionStatus] ?? statusParam}`,
        }
      : null,
  ].filter((item): item is { key: string; label: string } => item !== null)

  const from = `${location.pathname}${location.search}`

  function applyFilter(key: string, value: string) {
    update({ [key]: value || null })
  }

  function handleSort(next: InvestigationSort) {
    update({ sort: next === 'relevance' ? null : next })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Investigation explorer"
        title="Investigations"
        description="Search and inspect the cleaned NASA PSI records. Querying, filtering, sorting, and pagination happen on the read-only API, so the browser never loads the whole dataset."
        actions={
          <>
            <Badge
              variant={
                investigations.error
                  ? 'warning'
                  : data
                    ? 'success'
                    : 'muted'
              }
            >
              {investigations.error
                ? 'API offline'
                : data
                  ? `${formatCount(total)} matching`
                  : 'Loading…'}
            </Badge>
            <Badge variant="outline">Phase 3 · live data</Badge>
          </>
        }
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b border-border/70 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3">
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search by title, PSI identifier, keyword, objective, or approach…"
                aria-label="Search investigations"
                className="pl-9"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              <label className="sr-only" htmlFor="filter-relevance">
                Relevance
              </label>
              <Select
                id="filter-relevance"
                value={relevanceParam}
                onChange={(event) => applyFilter('relevance', event.target.value)}
                className="text-xs"
              >
                <option value="">All relevance</option>
                {(filters.data?.relevance ?? []).map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {filterLabel(entry, 'relevance')} ({formatCount(entry.count)})
                  </option>
                ))}
              </Select>

              <label className="sr-only" htmlFor="filter-area">
                Research area
              </label>
              <Select
                id="filter-area"
                value={area}
                onChange={(event) => applyFilter('area', event.target.value)}
                className="text-xs"
              >
                <option value="">All areas</option>
                {(filters.data?.research_area ?? []).map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.value} ({formatCount(entry.count)})
                  </option>
                ))}
              </Select>

              <label className="sr-only" htmlFor="filter-project-type">
                Project type
              </label>
              <Select
                id="filter-project-type"
                value={projectType}
                onChange={(event) =>
                  applyFilter('project_type', event.target.value)
                }
                className="text-xs"
              >
                <option value="">All project types</option>
                {(filters.data?.project_type ?? []).map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.value} ({formatCount(entry.count)})
                  </option>
                ))}
              </Select>

              <label className="sr-only" htmlFor="filter-extraction">
                Extraction status
              </label>
              <Select
                id="filter-extraction"
                value={statusParam}
                onChange={(event) => applyFilter('status', event.target.value)}
                className="text-xs"
              >
                <option value="">All statuses</option>
                {(filters.data?.extraction_status ?? []).map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {filterLabel(entry, 'extraction')} ({formatCount(entry.count)})
                  </option>
                ))}
              </Select>

              <label className="sr-only" htmlFor="sort-investigations">
                Sort investigations
              </label>
              <Select
                id="sort-investigations"
                value={sort}
                onChange={(event) => handleSort(event.target.value as InvestigationSort)}
                className="text-xs"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>

        <div className="flex flex-col gap-2 border-b border-border/70 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="size-3.5" aria-hidden="true" />
            {activeFilters.length === 0 ? (
              <span>No filters applied</span>
            ) : (
              activeFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => applyFilter(filter.key, '')}
                  className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  aria-label={`Remove filter ${filter.label}`}
                >
                  {filter.label}
                  <X className="size-3" aria-hidden="true" />
                </button>
              ))
            )}
            {activeFilters.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[11px] text-muted-foreground"
                onClick={() =>
                  update({
                    relevance: null,
                    area: null,
                    project_type: null,
                    status: null,
                  })
                }
              >
                Clear filters
              </Button>
            ) : null}
          </div>
          <span aria-live="polite">
            {investigations.isFetching && data ? 'Updating results…' : null}
          </span>
        </div>

        {investigations.error ? (
          <ErrorState
            title="Investigations could not be loaded"
            description={`${investigations.error.message} Check that the read-only API is running, then retry.`}
            onRetry={investigations.retry}
          />
        ) : investigations.isLoading ? (
          <LoadingState label="Loading investigations" rows={6} />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title={
              page > 1 && data.pagination.total > 0
                ? `Page ${page} is past the last page of results`
                : 'No investigations match this query'
            }
            description={
              page > 1 && data.pagination.total > 0
                ? `The query still matches ${formatCount(data.pagination.total)} records across ${formatCount(data.pagination.total_pages)} pages. Return to the first page to keep browsing.`
                : 'The API returned zero records for the current search and filters. Widen the query or clear everything to see all 133 investigations.'
            }
            action={
              page > 1 && data.pagination.total > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => update({ page: null }, { resetPage: false })}
                >
                  Go to page 1
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchInput('')
                    update({
                      q: null,
                      relevance: null,
                      area: null,
                      project_type: null,
                      status: null,
                      sort: null,
                    })
                  }}
                >
                  Clear search and filters
                </Button>
              )
            }
          />
        ) : data ? (
          <>
            <div className="overflow-x-auto">
              <table className="hidden w-full min-w-[56rem] border-collapse text-left text-sm md:table">
                <caption className="sr-only">
                  NASA PSI investigations. Sorted by {sortOptions.find((option) => option.value === sort)?.label ?? sort}.
                </caption>
                <thead>
                  <tr className="border-b border-border/70 bg-muted/30 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
                      PSI ID
                    </th>
                    <SortableHeader
                      label="Investigation"
                      sortValue="title"
                      current={sort}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Research area"
                      sortValue="area"
                      current={sort}
                      onSort={handleSort}
                      className="w-48"
                    />
                    <SortableHeader
                      label="Relevance"
                      sortValue="relevance"
                      current={sort}
                      onSort={handleSort}
                      className="w-32"
                    />
                    <SortableHeader
                      label="Project type"
                      sortValue="project_type"
                      current={sort}
                      onSort={handleSort}
                      className="hidden w-44 lg:table-cell"
                    />
                    <SortableHeader
                      label="Outputs"
                      sortValue="publications"
                      current={sort}
                      onSort={handleSort}
                      className="hidden w-40 xl:table-cell"
                    />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr
                      key={item.investigation_id}
                      className="border-b border-border/60 align-top transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <Link
                          to={`/investigations/${item.investigation_id}`}
                          state={{ from }}
                          className="font-mono text-xs font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {item.investigation_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/investigations/${item.investigation_id}`}
                          state={{ from }}
                          className="font-medium leading-snug underline-offset-4 hover:text-primary hover:underline"
                        >
                          {item.title}
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{item.research_area}</span>
                          <span aria-hidden="true">·</span>
                          <ExtractionBadge status={item.extraction_status} />
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                        {item.research_area}
                      </td>
                      <td className="px-4 py-3">
                        <RelevanceBadge
                          category={item.relevance_category}
                          score={item.relevance_score}
                          reason={item.relevance_reason}
                        />
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                        {item.project_type}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground xl:table-cell">
                        <span className="tabular-nums">
                          {formatCount(item.publication_count)}{' '}
                          {pluralize(item.publication_count, 'pub')}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span className="tabular-nums">
                          {formatCount(item.document_count)}{' '}
                          {pluralize(item.document_count, 'doc')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border/60 md:hidden">
              {data.items.map((item) => (
                <li key={item.investigation_id} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/investigations/${item.investigation_id}`}
                      state={{ from }}
                      className="font-mono text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {item.investigation_id}
                    </Link>
                    <RelevanceBadge
                      category={item.relevance_category}
                      score={item.relevance_score}
                      reason={item.relevance_reason}
                    />
                  </div>
                  <Link
                    to={`/investigations/${item.investigation_id}`}
                    state={{ from }}
                    className="mt-1.5 block font-medium leading-snug underline-offset-4 hover:text-primary hover:underline"
                  >
                    {item.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{item.research_area}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.project_type}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {formatCount(item.publication_count)}{' '}
                      {pluralize(item.publication_count, 'pub')}
                    </span>
                    <ExtractionBadge status={item.extraction_status} />
                  </div>
                </li>
              ))}
            </ul>

            <PaginationBar
              pagination={data.pagination}
              onPageChange={setPage}
              itemLabel="investigations"
              disabled={investigations.isFetching}
            />
          </>
        ) : null}
      </Card>

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Search behaviour</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Text search ranks PSI identifier matches first, then title,
              keywords, objectives, and approach. Filters narrow the collection
              before ranking; sorting applies to the filtered result.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Record pages</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Selecting a row opens the full record with its own investigation DOI,
              publication DOIs, documents, and provenance. Missing fields are
              labelled as not recorded — nothing is inferred to fill a gap.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
