import type { Prisma, PrismaClient } from '../generated/prisma/client.js'
import type { PublicationsQuery } from '../schemas/query.js'

type PublicationRow = Prisma.PublicationGetPayload<{
  include: {
    investigation: {
      select: {
        investigation_id: true
        title: true
        research_area: true
        relevance_category: true
      }
    }
  }
}>

export interface PublicationInvestigation {
  investigation_id: string
  title: string
  research_area: string
  relevance_category: string
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

export interface PublicationEntry {
  id: number
  investigation_id: string
  investigation_title: string
  research_area: string
  relevance_category: string
  label: string
  url: string | null
  doi: string | null
  authors: string[]
  status: string | null
  pubmed_id: string | null
}

export interface PublicationListResult {
  view: 'grouped' | 'entries'
  items: GroupedPublication[] | PublicationEntry[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

const DOI_PATTERN = /^10\.\d{4,9}\/\S+$/

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseAuthors(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (author): author is string => typeof author === 'string',
      )
    }
  } catch {
    // Fall through to an empty author list.
  }
  return []
}

function looksLikeDoi(value: string): boolean {
  return DOI_PATTERN.test(value.trim())
}

function normalizeInvestigationId(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }
  return value.trim().toUpperCase()
}

function matchesSearch(row: PublicationRow, term: string): boolean {
  const haystack = [
    row.label,
    row.doi,
    row.authors_json,
    row.investigation.title,
    row.investigation.investigation_id,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(term)
}

export async function listPublications(
  prisma: PrismaClient,
  query: PublicationsQuery,
): Promise<PublicationListResult> {
  const where: Prisma.PublicationWhereInput = {}

  const investigation = normalizeInvestigationId(query.investigation)
  if (investigation) {
    where.investigation_id = investigation
  }
  if (query.has_doi === true) {
    where.doi = { not: '' }
  }
  if (query.has_doi === false) {
    where.doi = ''
  }

  const rows = await prisma.publication.findMany({
    where,
    include: {
      investigation: {
        select: {
          investigation_id: true,
          title: true,
          research_area: true,
          relevance_category: true,
        },
      },
    },
  })

  const term = query.q?.trim().toLowerCase()
  const filtered = term
    ? rows.filter((row) => matchesSearch(row, term))
    : rows

  filtered.sort(
    (a, b) =>
      a.label_norm.localeCompare(b.label_norm) ||
      a.investigation_id.localeCompare(b.investigation_id) ||
      a.position - b.position,
  )

  if (query.view === 'entries') {
    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / query.page_size))
    const start = (query.page - 1) * query.page_size

    return {
      view: 'entries',
      items: filtered.slice(start, start + query.page_size).map(toEntry),
      pagination: {
        page: query.page,
        page_size: query.page_size,
        total,
        total_pages: totalPages,
      },
    }
  }

  const groups = new Map<string, GroupedPublication>()

  for (const row of filtered) {
    const doi = row.doi.trim()
    const label = row.label.trim()
    const normalizedLabel =
      row.label_norm.trim() || label.toLowerCase() || 'untitled'
    const key = doi
      ? `doi:${doi.toLowerCase()}`
      : `label:${normalizedLabel}`

    let group = groups.get(key)

    if (!group) {
      group = {
        key,
        label: label || doi || 'Untitled publication',
        doi: doi || null,
        url: emptyToNull(row.url),
        pubmed_id: emptyToNull(row.pubmed_id),
        authors: parseAuthors(row.authors_json),
        status: emptyToNull(row.status),
        entry_count: 0,
        investigations: [],
      }
      groups.set(key, group)
    }

    group.entry_count += 1

    // Prefer a real title over a DOI used as a fallback label.
    if (label && (!group.label || (looksLikeDoi(group.label) && !looksLikeDoi(label)))) {
      group.label = label
    }
    if (!group.doi && doi) {
      group.doi = doi
    }
    if (!group.url) {
      group.url = emptyToNull(row.url)
    }
    if (!group.pubmed_id) {
      group.pubmed_id = emptyToNull(row.pubmed_id)
    }
    if (group.authors.length === 0) {
      const authors = parseAuthors(row.authors_json)
      if (authors.length > 0) {
        group.authors = authors
      }
    }
    if (!group.status) {
      group.status = emptyToNull(row.status)
    }
    if (
      !group.investigations.some(
        (item) => item.investigation_id === row.investigation.investigation_id,
      )
    ) {
      group.investigations.push({
        investigation_id: row.investigation.investigation_id,
        title: row.investigation.title,
        research_area: row.investigation.research_area,
        relevance_category: row.investigation.relevance_category,
      })
    }
  }

  const items = [...groups.values()].sort(
    (a, b) =>
      a.label.localeCompare(b.label) ||
      (a.doi ?? '').localeCompare(b.doi ?? ''),
  )

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / query.page_size))
  const start = (query.page - 1) * query.page_size

  return {
    view: 'grouped',
    items: items.slice(start, start + query.page_size),
    pagination: {
      page: query.page,
      page_size: query.page_size,
      total,
      total_pages: totalPages,
    },
  }
}

function toEntry(row: PublicationRow): PublicationEntry {
  return {
    id: row.id,
    investigation_id: row.investigation.investigation_id,
    investigation_title: row.investigation.title,
    research_area: row.investigation.research_area,
    relevance_category: row.investigation.relevance_category,
    label: row.label,
    url: emptyToNull(row.url),
    doi: emptyToNull(row.doi),
    authors: parseAuthors(row.authors_json),
    status: emptyToNull(row.status),
    pubmed_id: emptyToNull(row.pubmed_id),
  }
}
