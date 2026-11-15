/**
 * Typed client for the read-only Phase 2 API.
 *
 * Phase 3 pages call these helpers instead of using `fetch` directly, so query
 * serialization and error handling stay consistent across the app.
 */

import type {
  ApiErrorBody,
  DatasetMeta,
  DocumentListResponse,
  FiltersResponse,
  GroupedPublicationResponse,
  HealthResponse,
  InvestigationDetail,
  InvestigationListResponse,
  InvestigationSort,
  Pagination,
  PublicationEntryResponse,
  StatisticsResponse,
} from '@/types/api'
import type {
  ExtractionStatus,
  RelevanceCategory,
} from '@/types/investigation'

const DEFAULT_BASE_URL = 'http://localhost:3001/api'

export const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL
).replace(/\/+$/, '')

type QueryValue = string | number | boolean | string[] | undefined | null

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(
    message: string,
    status: number,
    code: string,
    details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isNetworkError(): boolean {
    return this.code === 'network_error'
  }
}

export interface InvestigationListParams {
  q?: string
  relevance?: RelevanceCategory[]
  area?: string[]
  project_type?: string[]
  status?: ExtractionStatus[]
  sort?: InvestigationSort
  page?: number
  page_size?: number
}

export interface PublicationsParams {
  q?: string
  investigation?: string
  has_doi?: boolean
  view?: 'grouped' | 'entries'
  page?: number
  page_size?: number
}

export interface DocumentsParams {
  q?: string
  investigation?: string
  page?: number
  page_size?: number
}

interface RequestOptions {
  signal?: AbortSignal
}

function buildQueryString(params: object): string {
  const search = new URLSearchParams()

  for (const [key, raw] of Object.entries(params as Record<string, QueryValue>)) {
    if (raw === undefined || raw === null || raw === '') {
      continue
    }

    const value = Array.isArray(raw) ? raw.filter(Boolean).join(',') : String(raw)

    if (value.length > 0) {
      search.set(key, value)
    }
  }

  const query = search.toString()
  return query ? `?${query}` : ''
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ApiErrorBody).error?.message === 'string'
  )
}

async function request<T>(
  path: string,
  params: object = {},
  options: RequestOptions = {},
): Promise<T> {
  const url = `${apiBaseUrl}${path}${buildQueryString(params)}`

  let response: Response

  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }

    throw new ApiError(
      `Could not reach the API at ${apiBaseUrl}. Is the backend running?`,
      0,
      'network_error',
    )
  }

  const text = await response.text()
  const payload = text.length > 0 ? parseJson(text) : undefined

  if (!response.ok) {
    if (isApiErrorBody(payload)) {
      throw new ApiError(
        payload.error.message,
        response.status,
        payload.error.code,
        payload.error.details,
      )
    }

    throw new ApiError(
      `The API returned status ${response.status}.`,
      response.status,
      'http_error',
    )
  }

  return payload as T
}

export function getHealth(options?: RequestOptions): Promise<HealthResponse> {
  return request('/health', {}, options)
}

export function getDatasetMeta(
  options?: RequestOptions,
): Promise<DatasetMeta> {
  return getHealth(options).then((health) => health.dataset)
}

export function listInvestigations(
  params: InvestigationListParams = {},
  options?: RequestOptions,
): Promise<InvestigationListResponse> {
  return request('/investigations', params, options)
}

export function getInvestigation(
  investigationId: string,
  options?: RequestOptions,
): Promise<InvestigationDetail> {
  return request(
    `/investigations/${encodeURIComponent(investigationId)}`,
    {},
    options,
  )
}

export function getStatistics(
  options?: RequestOptions,
): Promise<StatisticsResponse> {
  return request('/statistics', {}, options)
}

export function getFilters(options?: RequestOptions): Promise<FiltersResponse> {
  return request('/filters', {}, options)
}

export function listPublications(
  params: PublicationsParams & { view: 'entries' },
  options?: RequestOptions,
): Promise<PublicationEntryResponse>
export function listPublications(
  params?: PublicationsParams & { view?: 'grouped' },
  options?: RequestOptions,
): Promise<GroupedPublicationResponse>
export function listPublications(
  params: PublicationsParams = {},
  options?: RequestOptions,
): Promise<GroupedPublicationResponse | PublicationEntryResponse> {
  return request('/publications', params, options)
}

export function listDocuments(
  params: DocumentsParams = {},
  options?: RequestOptions,
): Promise<DocumentListResponse> {
  return request('/documents', params, options)
}

/** Convenience helper for pagination controls. */
export function hasNextPage(pagination: Pagination): boolean {
  return pagination.page < pagination.total_pages
}

export function hasPreviousPage(pagination: Pagination): boolean {
  return pagination.page > 1
}
