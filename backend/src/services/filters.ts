import type { PrismaClient } from '../generated/prisma/client.js'
import type { CountEntry } from './statistics.js'

export interface FilterOptions {
  relevance: CountEntry[]
  research_area: CountEntry[]
  project_type: CountEntry[]
  extraction_status: CountEntry[]
  data_source: CountEntry[]
}

const relevanceOrder = ['direct', 'supporting', 'peripheral']

function sortByCount(rows: CountEntry[]): CountEntry[] {
  return rows.sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value),
  )
}

export async function getFilters(
  prisma: PrismaClient,
): Promise<FilterOptions> {
  const [relevance, area, projectType, extraction, dataSource] =
    await Promise.all([
      prisma.investigation.groupBy({
        by: ['relevance_category'],
        _count: { _all: true },
      }),
      prisma.investigation.groupBy({
        by: ['research_area'],
        _count: { _all: true },
      }),
      prisma.investigation.groupBy({
        by: ['project_type'],
        _count: { _all: true },
      }),
      prisma.investigation.groupBy({
        by: ['extraction_status'],
        _count: { _all: true },
      }),
      prisma.investigation.groupBy({
        by: ['data_source'],
        _count: { _all: true },
      }),
    ])

  const relevanceCounts = new Map(
    relevance.map((row) => [row.relevance_category, row._count._all]),
  )

  return {
    relevance: relevanceOrder.map((value) => ({
      value,
      count: relevanceCounts.get(value) ?? 0,
    })),
    research_area: sortByCount(
      area.map((row) => ({
        value: row.research_area,
        count: row._count._all,
      })),
    ),
    project_type: sortByCount(
      projectType.map((row) => ({
        value: row.project_type,
        count: row._count._all,
      })),
    ),
    extraction_status: sortByCount(
      extraction.map((row) => ({
        value: row.extraction_status,
        count: row._count._all,
      })),
    ),
    data_source: sortByCount(
      dataSource.map((row) => ({
        value: row.data_source,
        count: row._count._all,
      })),
    ),
  }
}
