import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink as ExternalLinkIcon,
  FileSearch,
  FileText,
  Link2,
  ShieldCheck,
} from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { DataField } from '@/components/data-field'
import { DoiLink } from '@/components/doi-link'
import { ExternalLink } from '@/components/external-link'
import { PageHeader } from '@/components/layout/page-header'
import { RelevanceBadge } from '@/components/relevance-badge'
import { ShowMoreList } from '@/components/show-more-list'
import { EmptyState } from '@/components/states/empty-state'
import { ErrorState } from '@/components/states/error-state'
import { LoadingState } from '@/components/states/loading-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ApiError, getInvestigation } from '@/lib/api'
import { useApiQuery } from '@/lib/api-hooks'
import {
  dataSourceLabels,
  doiUrl,
  extractionLabels,
  formatAuthorList,
  formatCount,
  pubmedUrl,
  shortHash,
  stripDoiPrefix,
} from '@/lib/format'
import type { ExtractionStatus } from '@/types/investigation'

const ID_PATTERN = /^PSI-\d+$/

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function isaText(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  return metadata ? optionalText(metadata[key]) : null
}

function isaList(
  metadata: Record<string, unknown> | null,
  key: string,
): string[] {
  const value = metadata?.[key]
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((item) =>
    typeof item === 'string' && item.trim().length > 0 ? [item.trim()] : [],
  )
}

interface IsaContact {
  name: string
  roles: string | null
  email: string | null
  affiliation: string | null
}

function isaContacts(metadata: Record<string, unknown> | null): IsaContact[] {
  const value = metadata?.contacts
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) {
      return []
    }
    const record = item as Record<string, unknown>
    const name = [optionalText(record.first_name), optionalText(record.last_name)]
      .filter(Boolean)
      .join(' ')

    if (!name) {
      return []
    }

    return [
      {
        name,
        roles: optionalText(record.roles),
        email: optionalText(record.email),
        affiliation: optionalText(record.affiliation),
      },
    ]
  })
}

function recordedDateRange(
  start: string | null,
  end: string | null,
): string | null {
  if (start && end) {
    return `${start} – ${end}`
  }
  return start ?? end
}

function ExtractionBadge({ status }: { status: ExtractionStatus }) {
  const variant =
    status === 'success'
      ? 'success'
      : status === 'incomplete'
        ? 'warning'
        : 'destructive'

  return <Badge variant={variant}>{extractionLabels[status] ?? status}</Badge>
}

export function InvestigationDetailPage() {
  const { investigationId } = useParams<{ investigationId: string }>()
  const location = useLocation()
  const id = (investigationId ?? '').trim().toUpperCase()
  const validId = ID_PATTERN.test(id)

  const { data, error, isLoading, retry } = useApiQuery(
    `investigation:${id}`,
    (signal) => getInvestigation(id, { signal }),
    { enabled: validId },
  )

  const backTo = (location.state as { from?: string } | null)?.from
  const notFound = error instanceof ApiError && error.status === 404

  const isa = data?.isa_metadata ?? null
  const contacts = isaContacts(isa)
  const hardwareLinks = isaList(isa, 'experiment_hardware_links')
  const designTerms = isaList(isa, 'study_design_terms')
  const reasonClauses = data
    ? data.relevance_reason
        .split('; ')
        .map((clause) => clause.trim())
        .filter(Boolean)
    : []
  const publicationCount = data?.publications.length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link to={backTo ?? '/investigations'}>
            <ArrowLeft aria-hidden="true" />
            {backTo ? 'Back to results' : 'All investigations'}
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow={data ? `Investigation ${data.investigation_id}` : 'Investigation details'}
        title={data?.title ?? (validId ? id : 'Invalid investigation ID')}
        description={
          data
            ? `${data.research_area} · ${data.project_type}`
            : validId
              ? 'Loading the record from the read-only API.'
              : 'Investigation IDs look like PSI-123. Choose a record from the explorer.'
        }
        actions={
          data ? (
            <>
              <RelevanceBadge
                category={data.relevance_category}
                score={data.relevance_score}
                reason={data.relevance_reason}
              />
              <ExtractionBadge status={data.extraction_status} />
              <Button variant="outline" size="sm" asChild>
                <a href={data.url} target="_blank" rel="noreferrer noopener">
                  NASA source
                  <ExternalLinkIcon aria-hidden="true" />
                </a>
              </Button>
            </>
          ) : (
            <Badge variant={validId && !error ? 'muted' : 'warning'}>
              {validId && !error ? 'Loading record…' : 'Record unavailable'}
            </Badge>
          )
        }
      />

      {!validId ? (
        <Card className="gap-0 py-0">
          <CardContent className="p-0">
            <EmptyState
              icon={FileSearch}
              title="This is not a valid investigation ID"
              description="The explorer only links to records that match the PSI identifier format, such as PSI-25."
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link to="/investigations">Return to the explorer</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="gap-0 py-0">
          <CardContent className="p-0">
            {notFound ? (
              <EmptyState
                icon={FileSearch}
                title={`No investigation ${id} in the dataset`}
                description="The API is reachable, but the cleaned dataset has no record with this identifier. Nothing is substituted in its place."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/investigations">Browse all investigations</Link>
                  </Button>
                }
              />
            ) : (
              <ErrorState
                title="The investigation could not be loaded"
                description={`${error.message} Check that the read-only API is running, then retry.`}
                onRetry={retry}
              />
            )}
          </CardContent>
        </Card>
      ) : isLoading || !data ? (
        <Card className="gap-0 py-0">
          <CardContent className="p-0">
            <LoadingState label="Loading investigation record" rows={7} />
          </CardContent>
        </Card>
      ) : (
        <>
          {data.extraction_status !== 'success' ? (
            <Alert variant="warning">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Extraction incomplete for this record</AlertTitle>
              <AlertDescription>
                {data.extraction_error ||
                  'Some sections could not be extracted completely. Missing text is shown as not recorded rather than reconstructed.'}
              </AlertDescription>
            </Alert>
          ) : null}

          {data.scraper_doi_unverified ? (
            <Alert variant="warning">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Unverified DOI captured by the scraper</AlertTitle>
              <AlertDescription>
                The value{' '}
                <span className="font-mono">{data.scraper_doi_unverified}</span>{' '}
                is kept in its own field and is not treated as the investigation
                DOI or as a publication DOI.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Research description</CardTitle>
                  <CardDescription>
                    Text as extracted from the curated dataset and ISA-Tab
                    metadata. Nothing is paraphrased or completed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <section className="space-y-1.5">
                    <h3 className="text-sm font-semibold tracking-tight">
                      Objectives
                    </h3>
                    {data.objectives.trim() ? (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {data.objectives}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Not recorded in the extracted dataset.
                      </p>
                    )}
                  </section>

                  <section className="space-y-1.5">
                    <h3 className="text-sm font-semibold tracking-tight">Approach</h3>
                    {data.approach.trim() ? (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {data.approach}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Not recorded in the extracted dataset.
                      </p>
                    )}
                  </section>

                  {data.hypothesis.trim() ? (
                    <section className="space-y-1.5">
                      <h3 className="text-sm font-semibold tracking-tight">
                        Hypothesis
                      </h3>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {data.hypothesis}
                      </p>
                    </section>
                  ) : null}

                  {data.impacts.trim() ? (
                    <section className="space-y-1.5">
                      <h3 className="text-sm font-semibold tracking-tight">Impacts</h3>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {data.impacts}
                      </p>
                    </section>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                    Relevance evidence
                  </CardTitle>
                  <CardDescription>
                    The matched phrases and rule that produced this label.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2">
                    <RelevanceBadge
                      category={data.relevance_category}
                      score={data.relevance_score}
                    />
                    <Badge variant="outline" className="tabular-nums">
                      score {data.relevance_score.toFixed(2)}
                    </Badge>
                    <Badge variant={data.is_combustion_related ? 'info' : 'muted'}>
                      {data.is_combustion_related
                        ? 'Combustion-related'
                        : 'Not flagged as combustion-related'}
                    </Badge>
                  </div>

                  {reasonClauses.length > 1 ? (
                    <ul className="mt-4 space-y-2">
                      {reasonClauses.map((clause, index) => (
                        <li
                          key={`${index}-${clause.slice(0, 24)}`}
                          className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                        >
                          <span aria-hidden="true" className="text-primary">
                            •
                          </span>
                          <span>{clause}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      {data.relevance_reason}
                    </p>
                  )}

                  <p className="mt-4 border-t border-border/70 pt-3 text-xs leading-relaxed text-muted-foreground">
                    The score is a prioritisation heuristic, not a measure of
                    scientific quality. The category is recomputed from the same
                    stored rule evidence every time the dataset is ingested.
                  </p>
                </CardContent>
              </Card>

              <Card className="gap-0 py-0">
                <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
                  <div className="space-y-1">
                    <CardTitle>Publications</CardTitle>
                    <CardDescription>
                      Publication DOIs are stored per entry and kept separate from
                      the investigation DOI.
                    </CardDescription>
                  </div>
                  <Badge variant="muted">
                    {formatCount(publicationCount)} {publicationCount === 1 ? 'entry' : 'entries'}
                  </Badge>
                </CardHeader>
                {publicationCount === 0 ? (
                  <CardContent className="p-5">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      No publication entries were recorded for this investigation.
                      An empty list reflects the source data, not a claim that no
                      papers exist.
                    </p>
                  </CardContent>
                ) : (
                  <>
                    <ShowMoreList
                      total={publicationCount}
                      initial={10}
                      itemLabel="publication"
                    >
                      {(limit) => (
                        <ul className="divide-y divide-border/60">
                          {data.publications.slice(0, limit).map((publication, index) => {
                            const doi = publication.doi
                            const resolver = doiUrl(doi)
                            const extraUrl =
                              publication.url && publication.url !== resolver
                                ? publication.url
                                : null

                            return (
                              <li
                                key={`${index}-${publication.label.slice(0, 32)}`}
                                className="px-5 py-4"
                              >
                                <p className="text-sm font-medium leading-snug">
                                  {publication.label || 'Untitled publication entry'}
                                </p>
                                {publication.authors.length > 0 ? (
                                  <p
                                    className="mt-0.5 text-xs leading-relaxed text-muted-foreground"
                                    title={publication.authors.join(', ')}
                                  >
                                    {formatAuthorList(publication.authors, 4)}
                                  </p>
                                ) : null}
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                  <DoiLink doi={doi} />
                                  {extraUrl ? (
                                    <ExternalLink href={extraUrl}>
                                      Source link
                                    </ExternalLink>
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
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </ShowMoreList>
                    <div className="border-t border-border/70 px-5 py-3">
                      <Link
                        to={`/library?tab=publications&investigation=${data.investigation_id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        <Link2 className="size-3.5" aria-hidden="true" />
                        View this record in the library
                      </Link>
                    </div>
                  </>
                )}
              </Card>

              <Card className="gap-0 py-0">
                <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
                  <div className="space-y-1">
                    <CardTitle>Documents</CardTitle>
                    <CardDescription>
                      File references present on the NASA PSI source page.
                    </CardDescription>
                  </div>
                  <Badge variant="muted">
                    {formatCount(data.files_and_documents.length)}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  {data.files_and_documents.length === 0 ? (
                    <p className="px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                      No documents were recorded for this investigation. This does
                      not prove that NASA has no related files.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {data.files_and_documents.map((document, index) => (
                        <li
                          key={`${index}-${document.label.slice(0, 32)}`}
                          className="flex items-start gap-3 px-5 py-3"
                        >
                          <FileText
                            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-medium leading-snug">
                              {document.label || 'Untitled document'}
                            </p>
                            <ExternalLink
                              href={document.url}
                              className="break-all text-[11px] text-muted-foreground"
                            >
                              Open file
                            </ExternalLink>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>At a glance</CardTitle>
                  <CardDescription>
                    Recorded fields. Empty values stay empty.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y divide-border/60">
                    <DataField label="Research area">{data.research_area}</DataField>
                    <DataField label="Project type">{data.project_type}</DataField>
                    <DataField label="Data source">
                      {dataSourceLabels[data.data_source] ?? data.data_source}
                    </DataField>
                    <DataField label="Study dates">
                      {recordedDateRange(
                        data.investigation_start_date,
                        data.investigation_end_date,
                      )}
                    </DataField>
                    <DataField label="Managing center">
                      {data.managing_center}
                    </DataField>
                    <DataField label="Space program">{data.space_program}</DataField>
                    <DataField label="Acronym">{data.acronym}</DataField>
                    <DataField label="Sub-area">{data.sub_research_area}</DataField>
                    <DataField label="Proposal title">
                      {data.proposal_title}
                    </DataField>
                    <DataField label="Investigation DOI">
                      {data.investigation_doi ? (
                        doiUrl(data.investigation_doi) ? (
                          <ExternalLink
                            href={doiUrl(data.investigation_doi) ?? '#'}
                            className="break-all font-mono text-xs"
                          >
                            {stripDoiPrefix(data.investigation_doi)}
                          </ExternalLink>
                        ) : (
                          <span className="break-all font-mono text-xs">
                            {data.investigation_doi}
                          </span>
                        )
                      ) : null}
                    </DataField>
                    <DataField label="Extraction">
                      <ExtractionBadge status={data.extraction_status} />
                    </DataField>
                  </dl>
                  <p className="mt-3 border-t border-border/70 pt-3 text-[11px] leading-relaxed text-muted-foreground">
                    Dates are shown exactly as recorded in the ISA-Tab metadata,
                    which uses more than one date format.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Keywords</CardTitle>
                  <CardDescription>Curated terms from the dataset.</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.keywords_list.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {data.keywords_list.map((keyword, index) => (
                        <li key={`${index}-${keyword}`}>
                          <Badge variant="muted" className="font-normal">
                            {keyword}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No keywords recorded.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="size-4 text-primary" aria-hidden="true" />
                    Related investigations
                  </CardTitle>
                  <CardDescription>
                    Identifiers recorded by NASA PSI.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.related_ids.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {data.related_ids.map((relatedId) => (
                        <li key={relatedId}>
                          <Link
                            to={`/investigations/${relatedId}`}
                            className="inline-flex rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 font-mono text-[11px] text-foreground underline-offset-4 transition-colors hover:bg-muted hover:underline"
                          >
                            {relatedId}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No related investigations recorded.
                    </p>
                  )}
                </CardContent>
              </Card>

              {isa ? (
                <Card>
                  <CardHeader>
                    <CardTitle>ISA-Tab metadata</CardTitle>
                    <CardDescription>
                      Additional fields from the curated archive.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isaText(isa, 'experiment_hardware') ? (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Experiment hardware
                        </p>
                        <p className="text-sm leading-relaxed">
                          {isaText(isa, 'experiment_hardware')}
                        </p>
                        {hardwareLinks.length > 0 ? (
                          <ul className="space-y-1">
                            {hardwareLinks.map((href) => (
                              <li key={href}>
                                <ExternalLink
                                  href={href}
                                  className="break-all text-[11px] text-muted-foreground"
                                >
                                  Hardware reference
                                </ExternalLink>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <DataField label="Flight platform">
                        {isaText(isa, 'flight_platform')}
                      </DataField>
                      <DataField label="Funding">
                        {isaText(isa, 'funding')}
                      </DataField>
                    </div>

                    {designTerms.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Study design terms
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {designTerms.map((term, index) => (
                            <li key={`${index}-${term}`}>
                              <Badge variant="outline" className="font-normal">
                                {term}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {contacts.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Contacts
                        </p>
                        <ul className="space-y-2">
                          {contacts.map((contact) => (
                            <li
                              key={`${contact.name}-${contact.email ?? contact.roles ?? ''}`}
                              className="rounded-md border border-border/70 bg-muted/20 px-3 py-2"
                            >
                              <p className="text-sm font-medium">{contact.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {[contact.roles, contact.affiliation]
                                  .filter(Boolean)
                                  .join(' · ') || 'Role not recorded'}
                              </p>
                              {contact.email ? (
                                <a
                                  href={`mailto:${contact.email}`}
                                  className="break-all text-[11px] text-primary underline-offset-4 hover:underline"
                                >
                                  {contact.email}
                                </a>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Source archive</CardTitle>
                  <CardDescription>
                    Provenance for the ingested record.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.source_archive ? (
                    <dl className="divide-y divide-border/60">
                      <DataField label="File">
                        <span className="break-all font-mono text-[11px]">
                          {data.source_archive.file}
                        </span>
                      </DataField>
                      <DataField label="Format">
                        {data.source_archive.format}
                      </DataField>
                      <DataField label="Study identifier">
                        <span className="font-mono text-xs">
                          {data.source_archive.study_identifier}
                        </span>
                      </DataField>
                      <DataField label="SHA-256">
                        <span
                          className="break-all font-mono text-[11px]"
                          title={data.source_archive.sha256}
                        >
                          {shortHash(data.source_archive.sha256, 20)}
                        </span>
                      </DataField>
                    </dl>
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      No ISA-Tab archive is linked to this record.
                    </p>
                  )}
                  {data.source_archive &&
                  data.source_archive.filename_matches_content === false ? (
                    <p className="mt-3 border-t border-border/70 pt-3 text-[11px] leading-relaxed text-muted-foreground">
                      The archive filename differs from this study identifier
                      because NASA archives bundle several studies per ZIP. This is
                      expected and is not treated as a data error.
                    </p>
                  ) : null}
                  {data.study_submission_date ? (
                    <p className="mt-3 border-t border-border/70 pt-3 text-[11px] leading-relaxed text-muted-foreground">
                      Study submission date, as recorded:{' '}
                      <span className="font-mono">
                        {data.study_submission_date}
                      </span>
                      .
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-start gap-2.5 p-5 text-xs leading-relaxed text-muted-foreground">
                  <ShieldCheck
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <p>
                    Investigation DOI, publication DOIs, and any unverified
                    scraper DOI are separate fields. Missing values are labelled,
                    incomplete extraction is surfaced, and relevance evidence is
                    shown with its rule text.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
