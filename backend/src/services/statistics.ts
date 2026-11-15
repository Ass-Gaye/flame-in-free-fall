import type { PrismaClient } from '../generated/prisma/client.js'
import { getDatasetMeta, type DatasetMeta } from '../lib/meta.js'

export interface CountEntry {
  value: string
  count: number
}

export interface Statistics {
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

function sortCounts(
  rows: { value: string; count: number }[],
): CountEntry[] {
  return rows.sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value),
  )
}

export async function getStatistics(
  prisma: PrismaClient,
): Promise<Statistics> {
  const [
    totalInvestigations,
    publicationCount,
    documentCount,
    archiveCount,
    byRelevanceRows,
    byAreaRows,
    byProjectTypeRows,
    byExtractionRows,
    byDataSourceRows,
    withInvestigationDoi,
    withPublications,
    withDocuments,
    publications,
    dataset,
  ] = await Promise.all([
    prisma.investigation.count(),
    prisma.publication.count(),
    prisma.document.count(),
    prisma.sourceArchive.count(),
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
    prisma.investigation.count({
      where: { investigation_doi: { not: '' } },
    }),
    prisma.investigation.count({
      where: { publications: { some: {} } },
    }),
    prisma.investigation.count({
      where: { documents: { some: {} } },
    }),
    prisma.publication.findMany({
      select: { doi: true, label_norm: true },
    }),
    getDatasetMeta(prisma),
  ])

  const relevanceCounts = new Map<string, number>([
    ['direct', 0],
    ['supporting', 0],
    ['peripheral', 0],
  ])
  for (const row of byRelevanceRows) {
    relevanceCounts.set(row.relevance_category, row._count._all)
  }

  const dois = new Set<string>()
  const labels = new Set<string>()
  let publicationsWithDoi = 0

  for (const publication of publications) {
    const doi = publication.doi.trim().toLowerCase()
    if (doi) {
      publicationsWithDoi += 1
      dois.add(doi)
    }
    if (publication.label_norm.trim()) {
      labels.add(publication.label_norm.trim())
    }
  }

  return {
    generated_at: new Date().toISOString(),
    dataset,
    totals: {
      investigations: totalInvestigations,
      publications: publicationCount,
      documents: documentCount,
      source_archives: archiveCount,
      research_areas: byAreaRows.length,
    },
    by_relevance: [...relevanceCounts.entries()].map(([value, count]) => ({
      value,
      count,
    })),
    by_research_area: sortCounts(
      byAreaRows.map((row) => ({
        value: row.research_area,
        count: row._count._all,
      })),
    ),
    by_project_type: sortCounts(
      byProjectTypeRows.map((row) => ({
        value: row.project_type,
        count: row._count._all,
      })),
    ),
    by_extraction_status: sortCounts(
      byExtractionRows.map((row) => ({
        value: row.extraction_status,
        count: row._count._all,
      })),
    ),
    by_data_source: sortCounts(
      byDataSourceRows.map((row) => ({
        value: row.data_source,
        count: row._count._all,
      })),
    ),
    publications: {
      entries: publicationCount,
      with_doi: publicationsWithDoi,
      distinct_dois: dois.size,
      distinct_labels: labels.size,
    },
    coverage: {
      with_investigation_doi: withInvestigationDoi,
      without_investigation_doi: totalInvestigations - withInvestigationDoi,
      with_publications: withPublications,
      without_publications: totalInvestigations - withPublications,
      with_documents: withDocuments,
      without_documents: totalInvestigations - withDocuments,
    },
  }
}
