/**
 * Types mirroring the cleaned NASA PSI dataset.
 *
 * The frontend does not read the dataset directly. These types describe the
 * payload the Phase 2 API will return, so the UI can be built and reviewed
 * before the backend exists.
 */

export type RelevanceCategory = 'direct' | 'supporting' | 'peripheral'

export type ExtractionStatus = 'success' | 'incomplete' | 'failed'

export interface Publication {
  label: string
  url?: string
  doi?: string
  authors?: string[]
  status?: string
  pubmed_id?: string
}

export interface Investigation {
  investigation_id: string
  title: string
  url: string
  research_area: string
  project_type: string
  objectives: string
  approach: string
  hypothesis?: string
  impacts?: string
  keywords?: string
  investigation_doi: string
  scraper_doi_unverified?: string
  publications: Publication[]
  files_and_documents: unknown[]
  relevance_category: RelevanceCategory
  relevance_score: number
  relevance_reason: string
  extraction_status: ExtractionStatus
  extraction_error?: string
  data_source: 'scrape' | 'zip+scrape'
}
