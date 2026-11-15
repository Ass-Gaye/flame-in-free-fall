import {
  BookOpen,
  ExternalLink as ExternalLinkIcon,
  FileText,
  Info,
  Link2,
  Search,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { DoiLink } from '@/components/doi-link'
import { ExternalLink } from '@/components/external-link'
import { PageHeader } from '@/components/layout/page-header'
import { PaginationBar } from '@/components/pagination-bar'
import { RelevanceBadge } from '@/components/relevance-badge'
import { EmptyState } from '@/components/states/empty-state'
import { ErrorState } from '@/components/states/error-state'
import { LoadingState } from '@/components/states/loading-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  getStatistics,
  listDocuments,
  listPublications,
} from '@/lib/api'
import { useApiQuery } from '@/lib/api-hooks'
import {
  doiUrl,
  formatAuthorList,
  formatCount,
  pubmedUrl,
} from '@/lib/format'
import {
  readEnumParam,
  readIntParam,
  readParam,
  useDebouncedSearchParam,
  useUrlQueryState,
} from '@/lib/query-state'
import { cn } from '@/lib/utils'
import type {
  GroupedPublicationResponse,
  PublicationEntryResponse,
} from '@/types/api'

const PAGE_SIZE = 25
const ID_PATTERN = /^PSI-\d+$/

type LibraryTab = 'publications' | 'documents'
type PublicationView = 'grouped' | 'entries'

const tabs: { value: LibraryTab; label: string; icon: typeof BookOpen }[] = [
  { value: 'publications', label: 'Publications', icon: BookOpen },
  { value: 'documents', label: 'Documents', icon: FileText },
]

function LibraryTabButton({
  tab,
  current,
  onSelect,
}: {
  tab: (typeof tabs)[number]
  current: LibraryTab
  onSelect: (tab: LibraryTab) => void
}) {
  const Icon = tab.icon
  const selected = current === tab.value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => onSelect(tab.value)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40',
        selected
          ? 'bg-primary/15 text-primary font-semibold shadow-xs'
          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {tab.label}
    </button>
  )
}

export function LibraryPage() {
  const { params, update, setPage } = useUrlQueryState()

  const tab = readEnumParam<LibraryTab>(
    params,
    'tab',
    ['publications', 'documents'],
    'publications',
  )
  const q = readParam(params, 'q')
  const investigationRaw = readParam(params, 'investigation').toUpperCase()
  const investigation = ID_PATTERN.test(investigationRaw) ? investigationRaw : ''
  const view = readEnumParam<PublicationView>(
    params,
    'view',
    ['grouped', 'entries'],
    'grouped',
  )
  const hasDoiRaw = readParam(params, 'has_doi')
  const hasDoi = hasDoiRaw === 'true' ? true : hasDoiRaw === 'false' ? false : undefined
  const page = readIntParam(params, 'page', 1)

  const [searchInput, setSearchInput] = useDebouncedSearchParam(
    q,
    (value) => update({ q: value || null }, { replace: true }),
  )

  const statistics = useApiQuery('statistics', (signal) => getStatistics({ signal }))

  const publications = useApiQuery(
    ['publications', q, investigation, view, hasDoiRaw, page].join('|'),
    (
      signal,
    ): Promise<GroupedPublicationResponse | PublicationEntryResponse> => {
      const base = {
        q: q || undefined,
        investigation: investigation || undefined,
        has_doi: hasDoi,
        page,
        page_size: PAGE_SIZE,
      }

      return view === 'entries'
        ? listPublications({ ...base, view: 'entries' }, { signal })
        : listPublications({ ...base, view: 'grouped' }, { signal })
    },
    { enabled: tab === 'publications' },
  )

  const documents = useApiQuery(
    ['documents', q, investigation, page].join('|'),
    (signal) =>
      listDocuments(
        {
          q: q || undefined,
          investigation: investigation || undefined,
          page,
          page_size: PAGE_SIZE,
        },
        { signal },
      ),
    { enabled: tab === 'documents' },
  )

  const publicationView =
    publications.data && publications.data.view === view ? publications.data : null
  const totalEntries = statistics.data?.totals.publications
  const withDoi = statistics.data?.publications.with_doi
  const withoutDoi =
    statistics.data && withDoi !== undefined
      ? statistics.data.totals.publications - withDoi
      : undefined

  const activeList = tab === 'publications' ? publications : documents
  const pagination =
    tab === 'publications'
      ? publicationView?.pagination
      : documents.data?.pagination

  const hasDoiFilter = tab === 'publications' && hasDoi !== undefined
  const hasFilters = Boolean(q || investigation || hasDoiFilter)

  function switchTab(next: LibraryTab) {
    update({
      tab: next === 'publications' ? null : next,
      q: null,
      page: null,
      has_doi: null,
      view: null,
    })
  }

  function clearFilters() {
    setSearchInput('')
    update({ q: null, investigation: null, has_doi: null })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Research library"
        title="Library"
        description="A single index for publication metadata, DOI links, available NASA documents, and related investigations. Publication DOIs stay separate from investigation DOIs."
        actions={
          <>
            <Badge variant={statistics.error ? 'warning' : 'success'}>
              {statistics.error
                ? 'API offline'
                : totalEntries !== undefined
                  ? `${formatCount(totalEntries)} publication entries`
                  : 'Loading index…'}
            </Badge>
            <Badge variant="outline">Phase 3 · live data</Badge>
          </>
        }
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b border-border/70 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3">
            <div
              role="tablist"
              aria-label="Library sections"
              className="flex w-fit gap-1 rounded-lg border border-border/80 bg-secondary/50 p-1"
            >
              {tabs.map((item) => (
                <LibraryTabButton
                  key={item.value}
                  tab={item}
                  current={tab}
                  onSelect={switchTab}
                />
              ))}
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={
                    tab === 'publications'
                      ? 'Search publication labels, authors, DOIs, or PSI IDs…'
                      : 'Search document labels or PSI IDs…'
                  }
                  aria-label={
                    tab === 'publications'
                      ? 'Search publications'
                      : 'Search documents'
                  }
                  className="pl-9"
                />
              </div>

              {tab === 'publications' ? (
                <>
                  <label className="sr-only" htmlFor="publication-view">
                    Publication view
                  </label>
                  <Select
                    id="publication-view"
                    value={view}
                    onChange={(event) =>
                      update({ view: event.target.value === 'grouped' ? null : event.target.value })
                    }
                    className="text-xs lg:w-44"
                  >
                    <option value="grouped">Grouped by DOI or label</option>
                    <option value="entries">Individual entries</option>
                  </Select>

                  <label className="sr-only" htmlFor="publication-doi">
                    DOI availability
                  </label>
                  <Select
                    id="publication-doi"
                    value={hasDoiRaw}
                    onChange={(event) =>
                      update({ has_doi: event.target.value || null })
                    }
                    className="text-xs lg:w-52"
                  >
                    <option value="">All publications</option>
                    <option value="true">
                      With DOI
                      {withDoi !== undefined ? ` (${formatCount(withDoi)})` : ''}
                    </option>
                    <option value="false">
                      Without DOI
                      {withoutDoi !== undefined
                        ? ` (${formatCount(withoutDoi)})`
                        : ''}
                    </option>
                  </Select>
                </>
              ) : null}
            </div>
          </div>
        </CardHeader>

        {hasFilters ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3 text-xs text-muted-foreground sm:px-5">
            <span className="inline-flex items-center gap-1.5">
              <Info className="size-3.5" aria-hidden="true" />
              Active filters
            </span>
            {investigation ? (
              <button
                type="button"
                onClick={() => update({ investigation: null })}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40"
                aria-label={`Remove filter PSI ${investigation}`}
              >
                <Link2 className="size-3" aria-hidden="true" />
                {investigation} only
                <X className="size-3" aria-hidden="true" />
              </button>
            ) : null}
            {hasDoiFilter ? (
              <button
                type="button"
                onClick={() => update({ has_doi: null })}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40"
                aria-label="Remove DOI availability filter"
              >
                {hasDoi ? 'With DOI' : 'Without DOI'}
                <X className="size-3" aria-hidden="true" />
              </button>
            ) : null}
            {q ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  update({ q: null })
                }}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40"
                aria-label="Remove search term"
              >
                “{q}”
                <X className="size-3" aria-hidden="true" />
              </button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[11px] text-muted-foreground"
              onClick={clearFilters}
            >
              Clear all
            </Button>
          </div>
        ) : null}

        {activeList.error ? (
          <ErrorState
            title={
              tab === 'publications'
                ? 'Publications could not be loaded'
                : 'Documents could not be loaded'
            }
            description={`${activeList.error.message} Check that the read-only API is running, then retry.`}
            onRetry={activeList.retry}
          />
        ) : activeList.isLoading ? (
          <LoadingState
            label={
              tab === 'publications'
                ? 'Loading publications'
                : 'Loading documents'
            }
            rows={6}
          />
        ) : tab === 'publications' && publicationView ? (
          publicationView.items.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={
                page > 1 && publicationView.pagination.total > 0
                  ? `Page ${page} is past the last page of publications`
                  : 'No publications match this query'
              }
              description={
                page > 1 && publicationView.pagination.total > 0
                  ? `The query still matches ${formatCount(publicationView.pagination.total)} publication groups. Return to the first page to keep browsing.`
                  : 'The API returned no publication entries for the current search and filters. Publication entries are not the same as investigation DOIs.'
              }
              action={
                page > 1 && publicationView.pagination.total > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => update({ page: null }, { resetPage: false })}
                  >
                    Go to page 1
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear search and filters
                  </Button>
                )
              }
            />
          ) : publicationView.view === 'grouped' ? (
            <ul className="divide-y divide-border/60">
              {publicationView.items.map((publication) => {
                const resolver = doiUrl(publication.doi)
                const extraUrl =
                  publication.url && publication.url !== resolver
                    ? publication.url
                    : null
                const visibleInvestigations = publication.investigations.slice(0, 3)
                const hiddenCount =
                  publication.investigations.length - visibleInvestigations.length

                return (
                  <li key={publication.key} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium leading-snug">
                          {publication.label}
                        </p>
                        {publication.authors.length > 0 ? (
                          <p
                            className="text-xs leading-relaxed text-muted-foreground"
                            title={publication.authors.join(', ')}
                          >
                            {formatAuthorList(publication.authors, 4)}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <DoiLink doi={publication.doi} />
                          {extraUrl ? (
                            <ExternalLink href={extraUrl}>Source link</ExternalLink>
                          ) : null}
                          {publication.pubmed_id ? (
                            <ExternalLink
                              href={pubmedUrl(publication.pubmed_id) ?? '#'}
                            >
                              PubMed {publication.pubmed_id}
                            </ExternalLink>
                          ) : null}
                          {publication.status ? (
                            <span>{publication.status}</span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {visibleInvestigations.map((item) => (
                            <Link
                              key={item.investigation_id}
                              to={`/investigations/${item.investigation_id}`}
                              title={item.title}
                              className="inline-flex rounded-full border border-border/80 bg-secondary/60 px-2 py-0.5 font-mono text-[10px] text-foreground underline-offset-4 transition-colors hover:border-primary/40 hover:bg-secondary/90 hover:text-primary hover:underline"
                            >
                              {item.investigation_id}
                            </Link>
                          ))}
                          {hiddenCount > 0 ? (
                            <span className="text-[10px] text-muted-foreground">
                              +{hiddenCount} more
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Badge variant="muted" className="shrink-0 tabular-nums">
                        {formatCount(publication.entry_count)}{' '}
                        {publication.entry_count === 1 ? 'entry' : 'entries'}
                      </Badge>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <ul className="divide-y divide-border/60">
              {publicationView.items.map((publication) => {
                const resolver = doiUrl(publication.doi)
                const extraUrl =
                  publication.url && publication.url !== resolver
                    ? publication.url
                    : null

                return (
                  <li key={publication.id} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium leading-snug">
                          {publication.label || 'Untitled publication entry'}
                        </p>
                        {publication.authors.length > 0 ? (
                          <p
                            className="text-xs leading-relaxed text-muted-foreground"
                            title={publication.authors.join(', ')}
                          >
                            {formatAuthorList(publication.authors, 4)}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <DoiLink doi={publication.doi} />
                          {extraUrl ? (
                            <ExternalLink href={extraUrl}>Source link</ExternalLink>
                          ) : null}
                          {publication.pubmed_id ? (
                            <ExternalLink
                              href={pubmedUrl(publication.pubmed_id) ?? '#'}
                            >
                              PubMed {publication.pubmed_id}
                            </ExternalLink>
                          ) : null}
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          <Link
                            to={`/investigations/${publication.investigation_id}`}
                            className="font-mono text-primary underline-offset-4 hover:underline"
                          >
                            {publication.investigation_id}
                          </Link>
                          {' · '}
                          {publication.research_area}
                        </p>
                      </div>
                      <RelevanceBadge
                        category={publication.relevance_category}
                        className="shrink-0"
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        ) : tab === 'documents' && documents.data ? (
          documents.data.items.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={
                page > 1 && documents.data.pagination.total > 0
                  ? `Page ${page} is past the last page of documents`
                  : 'No documents match this query'
              }
              description={
                page > 1 && documents.data.pagination.total > 0
                  ? `The query still matches ${formatCount(documents.data.pagination.total)} documents. Return to the first page to keep browsing.`
                  : 'The API returned no recorded file references for the current search and filters. An empty list does not prove NASA has no related files.'
              }
              action={
                page > 1 && documents.data.pagination.total > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => update({ page: null }, { resetPage: false })}
                  >
                    Go to page 1
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear search and filters
                  </Button>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {documents.data.items.map((document) => (
                <li
                  key={document.id}
                  className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium leading-snug">{document.label}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      <Link
                        to={`/investigations/${document.investigation_id}`}
                        className="font-mono text-primary underline-offset-4 hover:underline"
                      >
                        {document.investigation_id}
                      </Link>
                      {' · '}
                      {document.research_area}
                    </p>
                  </div>
                  <ExternalLink
                    href={document.url}
                    className="shrink-0 text-xs text-primary"
                  >
                    Open document
                  </ExternalLink>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {!activeList.error &&
        !activeList.isLoading &&
        pagination &&
        pagination.total > 0 ? (
          <PaginationBar
            pagination={pagination}
            onPageChange={setPage}
            itemLabel={
              tab === 'publications'
                ? publicationView?.view === 'entries'
                  ? 'entries'
                  : 'publication groups'
                : 'documents'
            }
            disabled={activeList.isFetching}
          />
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" aria-hidden="true" />
              How the index is built
            </CardTitle>
            <CardDescription>
              Grouping reduces repeats without hiding raw entries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">Grouped view</strong> merges
              entries that share a DOI, or a normalized title when no DOI exists.
              Each group lists the investigations it belongs to and how many
              source entries it represents.
            </p>
            <p>
              <strong className="text-foreground">Individual entries</strong> show
              one row per investigation–publication link, including the exact
              recorded URL and PubMed ID. Both views read the same API endpoint.
            </p>
            {statistics.data ? (
              <p className="border-t border-border/70 pt-3 text-xs">
                {formatCount(statistics.data.totals.publications)} entries across
                the dataset; {formatCount(statistics.data.publications.with_doi)}{' '}
                carry a DOI and{' '}
                {formatCount(statistics.data.publications.distinct_dois)} distinct
                publication DOIs are recorded.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLinkIcon className="size-4 text-primary" aria-hidden="true" />
              DOI separation
            </CardTitle>
            <CardDescription>
              Two different identifiers must never be conflated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              An <strong className="text-foreground">investigation DOI</strong>{' '}
              identifies the NASA PSI record itself and lives on the record page.
              It is never shown as a publication DOI.
            </p>
            <p>
              A <strong className="text-foreground">publication DOI</strong>{' '}
              identifies an associated paper and is stored per publication entry.
              Entries without a DOI link to their recorded source URL instead.
            </p>
            <p className="border-t border-border/70 pt-3 text-xs">
              Unverified DOIs captured by the scraper remain a separate field on
              the investigation record.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
