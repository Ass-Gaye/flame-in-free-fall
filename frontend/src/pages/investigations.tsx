import {
  ArrowUpDown,
  Download,
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
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { exportDatasetUrl, listInvestigations, getFilters } from '@/lib/api'
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
  { value: 'relevance', label: 'Relevance (Highest First)' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'area', label: 'Research Area (A–Z)' },
  { value: 'project_type', label: 'Project Type (A–Z)' },
  { value: 'extraction', label: 'Extraction Status' },
  { value: 'publications', label: 'Publications (Most First)' },
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
    <Badge variant={variant} className="font-mono text-[9.5px] px-1.5 py-0">
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
      className={cn('px-3.5 py-2.5 font-medium', className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortValue)}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-wider font-mono text-[10.5px] outline-none transition-colors hover:text-foreground cursor-pointer',
          active ? 'text-primary font-semibold' : 'text-muted-foreground',
        )}
      >
        {label}
        <ArrowUpDown
          className={cn('size-3', active ? 'text-primary' : 'opacity-40')}
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
          label: `Status: ${extractionLabels[statusParam as ExtractionStatus] ?? statusParam}`,
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Dataset Explorer"
        title="Investigations Directory"
        description="Search, filter, and inspect verified NASA Physical Sciences Informatics records. Query parameters are executed against the read-only database."
        actions={
          <div className="flex items-center gap-2">
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
                  ? `${formatCount(total)} investigations found`
                  : 'Searching…'}
            </Badge>
          </div>
        }
      />

      <Card className="overflow-hidden gap-0 py-0 border-border/70">
        {/* Search & Filter Toolbar */}
        <div className="border-b border-border/70 bg-card p-3.5 sm:p-4 space-y-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Search by title, PSI ID, research objective, approach, or keyword…"
              aria-label="Search investigations"
              className="pl-9 h-9 text-xs"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <label className="sr-only" htmlFor="filter-relevance">
              Relevance
            </label>
            <Select
              id="filter-relevance"
              value={relevanceParam}
              onChange={(event) => applyFilter('relevance', event.target.value)}
              className="text-xs h-8.5"
            >
              <option value="">All Relevance Tiers</option>
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
              className="text-xs h-8.5"
            >
              <option value="">All Research Areas</option>
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
              className="text-xs h-8.5"
            >
              <option value="">All Project Types</option>
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
              className="text-xs h-8.5"
            >
              <option value="">All Statuses</option>
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
              className="text-xs h-8.5"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Active Filters & Actions Subheader */}
        <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/20 px-3.5 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="size-3 text-muted-foreground/70" aria-hidden="true" />
            {activeFilters.length === 0 ? (
              <span className="font-mono text-[11px]">All records active ({total})</span>
            ) : (
              activeFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => applyFilter(filter.key, '')}
                  className="inline-flex items-center gap-1 rounded border border-border/80 bg-background/80 px-2 py-0.5 font-mono text-[10.5px] text-foreground outline-none transition-colors hover:bg-muted"
                  aria-label={`Remove filter ${filter.label}`}
                >
                  {filter.label}
                  <X className="size-2.5 text-muted-foreground" aria-hidden="true" />
                </button>
              ))
            )}
            {activeFilters.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10.5px] text-muted-foreground hover:text-foreground"
                onClick={() =>
                  update({
                    relevance: null,
                    area: null,
                    project_type: null,
                    status: null,
                  })
                }
              >
                Clear all
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span aria-live="polite" className="font-mono text-[10.5px] text-primary">
              {investigations.isFetching && data ? 'Syncing…' : null}
            </span>
            {data && data.items.length > 0 ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6.5 px-2 text-[10.5px] gap-1"
                  asChild
                >
                  <a
                    href={exportDatasetUrl({
                      format: 'json',
                      q: q || undefined,
                      relevance: relevanceParam ? [relevanceParam] : undefined,
                      area: area ? [area] : undefined,
                      project_type: projectType ? [projectType] : undefined,
                      status: statusParam ? [statusParam] : undefined,
                    })}
                    download="flame-in-freefall-results.json"
                  >
                    <Download className="size-2.5" aria-hidden="true" />
                    JSON
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6.5 px-2 text-[10.5px] gap-1"
                  asChild
                >
                  <a
                    href={exportDatasetUrl({
                      format: 'csv',
                      q: q || undefined,
                      relevance: relevanceParam ? [relevanceParam] : undefined,
                      area: area ? [area] : undefined,
                      project_type: projectType ? [projectType] : undefined,
                      status: statusParam ? [statusParam] : undefined,
                    })}
                    download="flame-in-freefall-results.csv"
                  >
                    <Download className="size-2.5" aria-hidden="true" />
                    CSV
                  </a>
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* State rendering */}
        {investigations.error ? (
          <ErrorState
            title="Investigations could not be loaded"
            description={`${investigations.error.message}. Please verify the backend API is online.`}
            onRetry={investigations.retry}
          />
        ) : investigations.isLoading ? (
          <LoadingState label="Loading investigations" rows={6} />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title={
              page > 1 && data.pagination.total > 0
                ? `Page ${page} is beyond result bounds`
                : 'No investigations match this query'
            }
            description={
              page > 1 && data.pagination.total > 0
                ? `The query matches ${formatCount(data.pagination.total)} records across ${formatCount(data.pagination.total_pages)} pages. Return to page 1.`
                : 'Zero investigations matched your query parameters. Try widening filters or resetting the search text.'
            }
            action={
              page > 1 && data.pagination.total > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => update({ page: null }, { resetPage: false })}
                >
                  Return to Page 1
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
                  Reset all filters
                </Button>
              )
            }
          />
        ) : data ? (
          <>
            {/* Desktop Table View */}
            <div className="overflow-x-auto">
              <table className="hidden w-full min-w-[56rem] border-collapse text-left text-xs md:table">
                <caption className="sr-only">
                  NASA PSI investigations. Sorted by {sortOptions.find((option) => option.value === sort)?.label ?? sort}.
                </caption>
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="px-3.5 py-2.5 font-medium sm:px-4 w-28">
                      PSI ID
                    </th>
                    <SortableHeader
                      label="Investigation"
                      sortValue="title"
                      current={sort}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Research Area"
                      sortValue="area"
                      current={sort}
                      onSort={handleSort}
                      className="w-44"
                    />
                    <SortableHeader
                      label="Relevance"
                      sortValue="relevance"
                      current={sort}
                      onSort={handleSort}
                      className="w-32"
                    />
                    <SortableHeader
                      label="Project Type"
                      sortValue="project_type"
                      current={sort}
                      onSort={handleSort}
                      className="hidden w-36 lg:table-cell"
                    />
                    <SortableHeader
                      label="Outputs"
                      sortValue="publications"
                      current={sort}
                      onSort={handleSort}
                      className="hidden w-36 xl:table-cell"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.items.map((item) => (
                    <tr
                      key={item.investigation_id}
                      className="align-middle transition-colors hover:bg-muted/30"
                    >
                      <td className="px-3.5 py-2.5 sm:px-4">
                        <Link
                          to={`/investigations/${item.investigation_id}`}
                          state={{ from }}
                          className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          {item.investigation_id}
                        </Link>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Link
                          to={`/investigations/${item.investigation_id}`}
                          state={{ from }}
                          className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline line-clamp-1"
                        >
                          {item.title}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
                          <span>{item.research_area}</span>
                          <span aria-hidden="true">·</span>
                          <ExtractionBadge status={item.extraction_status} />
                        </div>
                      </td>
                      <td className="hidden px-3.5 py-2.5 text-muted-foreground md:table-cell">
                        {item.research_area}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <RelevanceBadge
                          category={item.relevance_category}
                          score={item.relevance_score}
                          reason={item.relevance_reason}
                        />
                      </td>
                      <td className="hidden px-3.5 py-2.5 text-muted-foreground lg:table-cell">
                        {item.project_type}
                      </td>
                      <td className="hidden px-3.5 py-2.5 font-mono text-[11px] text-muted-foreground xl:table-cell">
                        <span className="tabular-nums font-medium text-foreground">
                          {formatCount(item.publication_count)}
                        </span>{' '}
                        {pluralize(item.publication_count, 'pub')}
                        <span aria-hidden="true"> · </span>
                        <span className="tabular-nums font-medium text-foreground">
                          {formatCount(item.document_count)}
                        </span>{' '}
                        {pluralize(item.document_count, 'doc')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked List View */}
            <ul className="divide-y divide-border/60 md:hidden">
              {data.items.map((item) => (
                <li key={item.investigation_id} className="p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/investigations/${item.investigation_id}`}
                      state={{ from }}
                      className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
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
                    className="block font-medium text-xs text-foreground underline-offset-4 hover:text-primary hover:underline leading-snug"
                  >
                    {item.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground font-mono">
                    <span>{item.research_area}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatCount(item.publication_count)} pubs</span>
                    <span aria-hidden="true">·</span>
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
    </div>
  )
}
