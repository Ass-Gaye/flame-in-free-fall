/**
 * Response types for the Phase 2 read-only API.
 *
 * These mirror `backend/src/services/*` exactly. Dataset-level types stay in
 * `investigation.ts`; this file only describes what the API returns.
 */

import type {
  ExtractionStatus,
  RelevanceCategory,
} from '@/types/investigation'

export type InvestigationSort =
  | 'relevance'
  | 'title'
  | 'area'
  | 'project_type'
  | 'extraction'
  | 'publications'

export interface DatasetMeta {
  dataset_sha256: string | null
  ingested_at: string | null
  record_count: number | null
}

export interface Pagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface ApiErrorDetail {
  path: string
  message: string
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: ApiErrorDetail[] | unknown
  }
}

export interface HealthResponse {
  status: 'ok'
  service: string
  environment: string
  database: {
    provider: 'sqlite'
    connected: boolean
  }
  investigations_loaded: number
  dataset: DatasetMeta
}

export interface InvestigationListItem {
  investigation_id: string
  title: string
  url: string
  research_area: string
  project_type: string
  relevance_category: RelevanceCategory
  relevance_score: number
  relevance_reason: string
  is_combustion_related: boolean
  extraction_status: ExtractionStatus
  investigation_doi: string | null
  publication_count: number
  document_count: number
}

export interface InvestigationListResponse {
  items: InvestigationListItem[]
  pagination: Pagination
}

export interface InvestigationPublication {
  label: string
  url: string | null
  doi: string | null
  authors: string[]
  status: string | null
  pubmed_id: string | null
}

export interface InvestigationDocument {
  label: string
  url: string
}

export interface SourceArchive {
  file: string
  format: string
  study_identifier: string
  sha256: string
  filename_matches_content: boolean
}

export interface InvestigationDetail {
  investigation_id: string
  title: string
  url: string
  research_area: string
  project_type: string
  objectives: string
  approach: string
  hypothesis: string
  impacts: string
  keywords: string
  keywords_list: string[]
  related: string
  related_ids: string[]
  investigation_doi: string | null
  scraper_doi_unverified: string | null
  relevance_category: RelevanceCategory
  relevance_score: number
  relevance_reason: string
  is_combustion_related: boolean
  extraction_status: ExtractionStatus
  extraction_error: string | null
  data_source: 'scrape' | 'zip+scrape'
  acronym: string | null
  sub_research_area: string | null
  managing_center: string | null
  space_program: string | null
  proposal_title: string | null
  investigation_start_date: string | null
  investigation_end_date: string | null
  study_submission_date: string | null
  study_public_release_date: string | null
  isa_metadata: Record<string, unknown> | null
  source_archive: SourceArchive | null
  publications: InvestigationPublication[]
  files_and_documents: InvestigationDocument[]
}

export interface CountEntry {
  value: string
  count: number
}

export interface StatisticsResponse {
  generated_at: string
  dataset: DatasetMeta
  totals: {
    investigations: number
    publications: number
    documents: number
    source_archives: number
    research_areas: number
  }
  by_relevance: CountEntry[]
  by_research_area: CountEntry[]
  by_project_type: CountEntry[]
  by_extraction_status: CountEntry[]
  by_data_source: CountEntry[]
  publications: {
    entries: number
    with_doi: number
    distinct_dois: number
    distinct_labels: number
  }
  coverage: {
    with_investigation_doi: number
    without_investigation_doi: number
    with_publications: number
    without_publications: number
    with_documents: number
    without_documents: number
  }
}

export interface FiltersResponse {
  relevance: CountEntry[]
  research_area: CountEntry[]
  project_type: CountEntry[]
  extraction_status: CountEntry[]
  data_source: CountEntry[]
}

export interface PublicationInvestigation {
  investigation_id: string
  title: string
  research_area: string
  relevance_category: RelevanceCategory
}

export interface GroupedPublication {
  key: string
  label: string
  doi: string | null
  url: string | null
  pubmed_id: string | null
  authors: string[]
  status: string | null
  entry_count: number
  investigations: PublicationInvestigation[]
}

export interface GroupedPublicationResponse {
  view: 'grouped'
  items: GroupedPublication[]
  pagination: Pagination
}

export interface PublicationEntry {
  id: number
  investigation_id: string
  investigation_title: string
  research_area: string
  relevance_category: RelevanceCategory
  label: string
  url: string | null
  doi: string | null
  authors: string[]
  status: string | null
  pubmed_id: string | null
}

export interface PublicationEntryResponse {
  view: 'entries'
  items: PublicationEntry[]
  pagination: Pagination
}

export interface DocumentItem {
  id: number
  investigation_id: string
  investigation_title: string
  research_area: string
  label: string
  url: string
}

export interface DocumentListResponse {
  items: DocumentItem[]
  pagination: Pagination
}
