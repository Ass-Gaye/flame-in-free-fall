import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { PrismaClient } from '../generated/prisma/client.js'
import { validateDataset, type DatasetRecord } from './validate.js'

export interface IngestionLogger {
  info: (message: string) => void
  warn: (message: string) => void
}

export interface IngestOptions {
  prisma: PrismaClient
  sourcePath: string
  force?: boolean
  dryRun?: boolean
  logger?: IngestionLogger
}

export interface IngestSummary {
  skipped: boolean
  recordCount: number
  publicationCount: number
  documentCount: number
  archiveCount: number
  datasetSha256: string
  sourcePath: string
  warnings: string[]
}

const RELEVANCE_RANK = {
  direct: 0,
  supporting: 1,
  peripheral: 2,
} as const

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isaString(
  record: DatasetRecord,
  key: string,
): string | null {
  const value = record.isa_metadata?.[key]
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function investigationRow(record: DatasetRecord, raw: unknown) {
  return {
    investigation_id: record.investigation_id,
    title: record.title,
    url: record.url,
    research_area: record.research_area,
    project_type: record.project_type,

    objectives: record.objectives,
    approach: record.approach,
    hypothesis: record.hypothesis,
    impacts: record.impacts,
    keywords: record.keywords,
    related: record.related,

    investigation_doi: record.investigation_doi.trim(),
    scraper_doi_unverified: record.scraper_doi_unverified.trim(),

    relevance_category: record.relevance_category,
    relevance_rank: RELEVANCE_RANK[record.relevance_category],
    relevance_score: record.relevance_score,
    relevance_reason: record.relevance_reason,
    is_combustion_related: record.is_combustion_related,

    extraction_status: record.extraction_status,
    extraction_error: record.extraction_error,
    data_source: record.data_source,

    acronym: isaString(record, 'acronym'),
    sub_research_area: isaString(record, 'sub_research_area'),
    managing_center: isaString(record, 'managing_center'),
    space_program: isaString(record, 'space_program'),
    proposal_title: isaString(record, 'proposal_title'),
    investigation_start_date: isaString(record, 'investigation_start_date'),
    investigation_end_date: isaString(record, 'investigation_end_date'),
    study_submission_date: isaString(record, 'study_submission_date'),
    study_public_release_date: isaString(
      record,
      'study_public_release_date',
    ),

    raw_json: JSON.stringify(raw),
  }
}

export async function ingestDataset(
  options: IngestOptions,
): Promise<IngestSummary> {
  const { prisma, sourcePath, force = false, dryRun = false } = options

  const buffer = await readFile(sourcePath)
  const datasetSha256 = createHash('sha256').update(buffer).digest('hex')
  const parsed: unknown = JSON.parse(buffer.toString('utf8'))
  const { records, rawRecords, warnings } = validateDataset(parsed)

  const publicationCount = records.reduce(
    (total, record) => total + record.publications.length,
    0,
  )
  const documentCount = records.reduce(
    (total, record) => total + record.files_and_documents.length,
    0,
  )
  const archiveCount = records.filter((record) => record.source_archive).length

  const summary: IngestSummary = {
    skipped: false,
    recordCount: records.length,
    publicationCount,
    documentCount,
    archiveCount,
    datasetSha256,
    sourcePath: path.resolve(sourcePath),
    warnings,
  }

  if (dryRun) {
    return summary
  }

  const latestRun = await prisma.ingestionRun.findFirst({
    orderBy: { id: 'desc' },
  })

  if (!force && latestRun?.dataset_sha256 === datasetSha256) {
    return {
      ...summary,
      skipped: true,
      recordCount: latestRun.record_count,
      publicationCount: latestRun.publication_count,
      documentCount: latestRun.document_count,
      archiveCount: latestRun.archive_count,
    }
  }

  const startedAt = new Date()

  await prisma.$transaction(
    async (tx) => {
      // Full rebuild keeps the database exactly aligned with the source file
      // and makes stale records impossible after a dataset refresh.
      await tx.document.deleteMany()
      await tx.publication.deleteMany()
      await tx.sourceArchive.deleteMany()
      await tx.investigation.deleteMany()

      const investigations = records.map((record, index) =>
        investigationRow(record, rawRecords[index]),
      )

      for (const rows of chunk(investigations, 50)) {
        await tx.investigation.createMany({ data: rows })
      }

      const publications = records.flatMap((record) =>
        record.publications.map((publication, position) => ({
          investigation_id: record.investigation_id,
          position,
          label: publication.label,
          label_norm: normalizeLabel(publication.label),
          url: publication.url,
          doi: publication.doi.trim(),
          authors_json: JSON.stringify(publication.authors),
          status: publication.status,
          pubmed_id: publication.pubmed_id,
        })),
      )

      for (const rows of chunk(publications, 200)) {
        await tx.publication.createMany({ data: rows })
      }

      const documents = records.flatMap((record) =>
        record.files_and_documents.map((document, position) => ({
          investigation_id: record.investigation_id,
          position,
          label: document.label,
          url: document.url,
        })),
      )

      for (const rows of chunk(documents, 200)) {
        await tx.document.createMany({ data: rows })
      }

      const archives = records
        .filter((record) => record.source_archive)
        .map((record) => ({
          investigation_id: record.investigation_id,
          file: record.source_archive!.file,
          format: record.source_archive!.format,
          study_identifier: record.source_archive!.study_identifier,
          sha256: record.source_archive!.sha256,
          filename_matches_content:
            record.source_archive!.filename_matches_content,
        }))

      for (const rows of chunk(archives, 50)) {
        await tx.sourceArchive.createMany({ data: rows })
      }

      await tx.ingestionRun.create({
        data: {
          dataset_sha256: datasetSha256,
          source_path: path.resolve(sourcePath),
          record_count: records.length,
          publication_count: publicationCount,
          document_count: documentCount,
          archive_count: archiveCount,
          started_at: startedAt,
          finished_at: new Date(),
        },
      })
    },
    { timeout: 120_000 },
  )

  options.logger?.info(
    `Ingested ${records.length} investigations, ${publicationCount} publications, ${documentCount} documents, and ${archiveCount} source archives.`,
  )

  return summary
}
