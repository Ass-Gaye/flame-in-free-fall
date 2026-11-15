import type { Prisma, PrismaClient } from '../generated/prisma/client.js'
import type { InvestigationListQuery } from '../schemas/query.js'

type InvestigationRow = Prisma.InvestigationGetPayload<{
  include: {
    _count: {
      select: {
        publications: true
        documents: true
      }
    }
  }
}>

export interface InvestigationListItem {
  investigation_id: string
  title: string
  url: string
  research_area: string
  project_type: string
  relevance_category: string
  relevance_score: number
  relevance_reason: string
  is_combustion_related: boolean
  extraction_status: string
  investigation_doi: string | null
  publication_count: number
  document_count: number
}

export interface InvestigationListResult {
  items: InvestigationListItem[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
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
  relevance_category: string
  relevance_score: number
  relevance_reason: string
  is_combustion_related: boolean
  extraction_status: string
  extraction_error: string | null
  data_source: string
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
  source_archive: {
    file: string
    format: string
    study_identifier: string
    sha256: string
    filename_matches_content: boolean
  } | null
  publications: {
    label: string
    url: string | null
    doi: string | null
    authors: string[]
    status: string | null
    pubmed_id: string | null
  }[]
  files_and_documents: {
    label: string
    url: string
  }[]
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function splitKeywords(value: string): string[] {
  return value
    .split(/\s{2,}|\t+|\r?\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function splitRelated(value: string): string[] {
  return value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => /^PSI-\d+$/.test(part))
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function searchScore(row: InvestigationRow, term: string): number | null {
  const id = row.investigation_id.toLowerCase()
  const title = row.title.toLowerCase()
  const keywords = row.keywords.toLowerCase()
  const objectives = row.objectives.toLowerCase()
  const approach = row.approach.toLowerCase()

  const haystack = [id, title, keywords, objectives, approach].join(' ')
  const tokens = term.split(' ').filter(Boolean)

  const matches =
    haystack.includes(term) || tokens.every((token) => haystack.includes(token))

  if (!matches) {
    return null
  }

  let score = 0

  if (id === term) score += 1000
  else if (id.startsWith(term)) score += 700
  else if (id.includes(term)) score += 500

  if (title.includes(term)) score += 400
  if (keywords.includes(term)) score += 250
  if (objectives.includes(term)) score += 150
  if (approach.includes(term)) score += 100

  const tokenHits = tokens.filter(
    (token) => title.includes(token) || keywords.includes(token),
  ).length
  score += tokenHits * 10

  return score
}

function extractionRank(status: string): number {
  if (status === 'success') return 0
  if (status === 'incomplete') return 1
  return 2
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

function buildWhere(query: InvestigationListQuery): Prisma.InvestigationWhereInput {
  const where: Prisma.InvestigationWhereInput = {}

  if (query.relevance && query.relevance.length > 0) {
    where.relevance_category = { in: query.relevance }
  }
  if (query.area && query.area.length > 0) {
    where.research_area = { in: query.area }
  }
  if (query.project_type && query.project_type.length > 0) {
    where.project_type = { in: query.project_type }
  }
  if (query.status && query.status.length > 0) {
    where.extraction_status = { in: query.status }
  }

  return where
}

function toListItem(row: InvestigationRow): InvestigationListItem {
  return {
    investigation_id: row.investigation_id,
    title: row.title,
    url: row.url,
    research_area: row.research_area,
    project_type: row.project_type,
    relevance_category: row.relevance_category,
    relevance_score: row.relevance_score,
    relevance_reason: row.relevance_reason,
    is_combustion_related: row.is_combustion_related,
    extraction_status: row.extraction_status,
    investigation_doi: emptyToNull(row.investigation_doi),
    publication_count: row._count.publications,
    document_count: row._count.documents,
  }
}

export async function listInvestigations(
  prisma: PrismaClient,
  query: InvestigationListQuery,
): Promise<InvestigationListResult> {
  const rows = await prisma.investigation.findMany({
    where: buildWhere(query),
    include: {
      _count: {
        select: {
          publications: true,
          documents: true,
        },
      },
    },
  })

  const term = query.q ? normalizeSearch(query.q) : null

  const ranked = rows.flatMap((row) => {
    if (!term) {
      return [{ row, searchScore: 0 }]
    }
    const score = searchScore(row, term)
    return score === null ? [] : [{ row, searchScore: score }]
  })

  ranked.sort((a, b) => {
    if (term && b.searchScore !== a.searchScore) {
      return b.searchScore - a.searchScore
    }

    switch (query.sort) {
      case 'title':
        return compareText(a.row.title, b.row.title)
      case 'area':
        return (
          compareText(a.row.research_area, b.row.research_area) ||
          compareText(a.row.title, b.row.title)
        )
      case 'project_type':
        return (
          compareText(a.row.project_type, b.row.project_type) ||
          compareText(a.row.title, b.row.title)
        )
      case 'extraction':
        return (
          extractionRank(a.row.extraction_status) -
            extractionRank(b.row.extraction_status) ||
          compareText(a.row.title, b.row.title)
        )
      case 'publications':
        return (
          b.row._count.publications - a.row._count.publications ||
          compareText(a.row.title, b.row.title)
        )
      case 'relevance':
      default:
        return (
          a.row.relevance_rank - b.row.relevance_rank ||
          b.row.relevance_score - a.row.relevance_score ||
          compareText(a.row.title, b.row.title)
        )
    }
  })

  const total = ranked.length
  const totalPages = Math.max(1, Math.ceil(total / query.page_size))
  const start = (query.page - 1) * query.page_size
  const items = ranked
    .slice(start, start + query.page_size)
    .map((entry) => toListItem(entry.row))

  return {
    items,
    pagination: {
      page: query.page,
      page_size: query.page_size,
      total,
      total_pages: totalPages,
    },
  }
}

export async function getInvestigation(
  prisma: PrismaClient,
  investigationId: string,
): Promise<InvestigationDetail | null> {
  const row = await prisma.investigation.findUnique({
    where: { investigation_id: investigationId.trim().toUpperCase() },
    include: {
      publications: { orderBy: { position: 'asc' } },
      documents: { orderBy: { position: 'asc' } },
      source_archive: true,
    },
  })

  if (!row) {
    return null
  }

  let raw: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(row.raw_json)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      raw = parsed as Record<string, unknown>
    }
  } catch {
    // The raw record is preserved as stored; a parse failure only means the
    // optional ISA metadata cannot be surfaced.
  }

  const isaMetadata =
    raw.isa_metadata &&
    typeof raw.isa_metadata === 'object' &&
    !Array.isArray(raw.isa_metadata)
      ? (raw.isa_metadata as Record<string, unknown>)
      : null

  return {
    investigation_id: row.investigation_id,
    title: row.title,
    url: row.url,
    research_area: row.research_area,
    project_type: row.project_type,
    objectives: row.objectives,
    approach: row.approach,
    hypothesis: row.hypothesis,
    impacts: row.impacts,
    keywords: row.keywords,
    keywords_list: splitKeywords(row.keywords),
    related: row.related,
    related_ids: splitRelated(row.related),
    investigation_doi: emptyToNull(row.investigation_doi),
    scraper_doi_unverified: emptyToNull(row.scraper_doi_unverified),
    relevance_category: row.relevance_category,
    relevance_score: row.relevance_score,
    relevance_reason: row.relevance_reason,
    is_combustion_related: row.is_combustion_related,
    extraction_status: row.extraction_status,
    extraction_error: emptyToNull(row.extraction_error),
    data_source: row.data_source,
    acronym: row.acronym,
    sub_research_area: row.sub_research_area,
    managing_center: row.managing_center,
    space_program: row.space_program,
    proposal_title: row.proposal_title,
    investigation_start_date: row.investigation_start_date,
    investigation_end_date: row.investigation_end_date,
    study_submission_date: row.study_submission_date,
    study_public_release_date: row.study_public_release_date,
    isa_metadata: isaMetadata,
    source_archive: row.source_archive
      ? {
          file: row.source_archive.file,
          format: row.source_archive.format,
          study_identifier: row.source_archive.study_identifier,
          sha256: row.source_archive.sha256,
          filename_matches_content:
            row.source_archive.filename_matches_content,
        }
      : null,
    publications: row.publications.map((publication) => ({
      label: publication.label,
      url: emptyToNull(publication.url),
      doi: emptyToNull(publication.doi),
      authors: parseAuthors(publication.authors_json),
      status: emptyToNull(publication.status),
      pubmed_id: emptyToNull(publication.pubmed_id),
    })),
    files_and_documents: row.documents.map((document) => ({
      label: document.label,
      url: document.url,
    })),
  }
}

function parseAuthors(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.filter((author): author is string => typeof author === 'string')
    }
  } catch {
    // Fall through to an empty author list.
  }
  return []
}

export async function getFilteredInvestigationRawRecords(
  prisma: PrismaClient,
  query: {
    q?: string
    relevance?: InvestigationListQuery['relevance']
    area?: string[]
    project_type?: string[]
    status?: InvestigationListQuery['status']
  },
): Promise<Record<string, unknown>[]> {
  const where = buildWhere(query as InvestigationListQuery)
  const rows = await prisma.investigation.findMany({
    where,
    select: {
      investigation_id: true,
      title: true,
      keywords: true,
      objectives: true,
      approach: true,
      raw_json: true,
    },
  })

  const term = query.q ? normalizeSearch(query.q) : null

  const ranked = rows.flatMap((row) => {
    if (!term) {
      return [{ row, searchScore: 0 }]
    }
    const score = searchScore(row as unknown as InvestigationRow, term)
    return score === null ? [] : [{ row, searchScore: score }]
  })

  if (term) {
    ranked.sort((a, b) => b.searchScore - a.searchScore)
  }

  return ranked.map((item) => JSON.parse(item.row.raw_json) as Record<string, unknown>)
}

export function recordsToCsv(records: Record<string, unknown>[]): string {
  if (records.length === 0) {
    return '\uFEFF'
  }

  const fieldnames: string[] = []
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!fieldnames.includes(key)) {
        fieldnames.push(key)
      }
    }
  }

  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) {
      return ''
    }
    let str: string
    if (typeof value === 'object') {
      str = JSON.stringify(value)
    } else {
      str = String(value)
    }

    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const header = fieldnames.map(escapeCell).join(',')
  const rows = records.map((record) =>
    fieldnames.map((field) => escapeCell(record[field])).join(','),
  )

  return '\uFEFF' + [header, ...rows].join('\r\n') + '\r\n'
}
