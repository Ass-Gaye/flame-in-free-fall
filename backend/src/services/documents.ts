import type { Prisma, PrismaClient } from '../generated/prisma/client.js'
import type { DocumentsQuery } from '../schemas/query.js'

type DocumentRow = Prisma.DocumentGetPayload<{
  include: {
    investigation: {
      select: {
        investigation_id: true
        title: true
        research_area: true
      }
    }
  }
}>

export interface DocumentItem {
  id: number
  investigation_id: string
  investigation_title: string
  research_area: string
  label: string
  url: string
}

export interface DocumentListResult {
  items: DocumentItem[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

function normalizeInvestigationId(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }
  return value.trim().toUpperCase()
}

export async function listDocuments(
  prisma: PrismaClient,
  query: DocumentsQuery,
): Promise<DocumentListResult> {
  const where: Prisma.DocumentWhereInput = {}

  const investigation = normalizeInvestigationId(query.investigation)
  if (investigation) {
    where.investigation_id = investigation
  }

  const rows = await prisma.document.findMany({
    where,
    include: {
      investigation: {
        select: {
          investigation_id: true,
          title: true,
          research_area: true,
        },
      },
    },
  })

  const term = query.q?.trim().toLowerCase()
  const filtered = term
    ? rows.filter((row) =>
        [row.label, row.url, row.investigation.title]
          .join(' ')
          .toLowerCase()
          .includes(term),
      )
    : rows

  filtered.sort(
    (a, b) =>
      a.label.localeCompare(b.label) ||
      a.investigation_id.localeCompare(b.investigation_id) ||
      a.position - b.position,
  )

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / query.page_size))
  const start = (query.page - 1) * query.page_size

  return {
    items: filtered.slice(start, start + query.page_size).map(toItem),
    pagination: {
      page: query.page,
      page_size: query.page_size,
      total,
      total_pages: totalPages,
    },
  }
}

function toItem(row: DocumentRow): DocumentItem {
  return {
    id: row.id,
    investigation_id: row.investigation.investigation_id,
    investigation_title: row.investigation.title,
    research_area: row.investigation.research_area,
    label: row.label,
    url: row.url,
  }
}
