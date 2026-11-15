import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { afterAll, describe, expect, it } from 'vitest'

import { config } from '../src/config.js'
import { prisma } from '../src/db.js'
import { ingestDataset } from '../src/ingest/ingest.js'
import { validateDataset } from '../src/ingest/validate.js'
import { DatasetValidationError } from '../src/lib/errors.js'

afterAll(async () => {
  await prisma.$disconnect()
})

async function sha256(path: string): Promise<string> {
  const buffer = await readFile(path)
  return createHash('sha256').update(buffer).digest('hex')
}

function baseRecord(overrides: Record<string, unknown> = {}) {
  return {
    investigation_id: 'PSI-999',
    title: 'Synthetic validation record',
    url: 'https://example.test/investigations/PSI-999',
    research_area: 'Combustion',
    project_type: 'Experiment',
    relevance_category: 'direct',
    relevance_score: 0.9,
    relevance_reason: 'Synthetic record used by tests.',
    is_combustion_related: true,
    extraction_status: 'success',
    data_source: 'scrape',
    ...overrides,
  }
}

function expectValidationIssue(input: unknown, pattern: RegExp): void {
  try {
    validateDataset(input)
  } catch (error) {
    expect(error).toBeInstanceOf(DatasetValidationError)
    const issues = (error as DatasetValidationError).issues
    expect(issues.join('\n')).toMatch(pattern)
    return
  }

  expect.fail('Expected dataset validation to fail.')
}

describe('dataset validation', () => {
  it('accepts a minimal well-formed record', () => {
    const result = validateDataset([baseRecord()])

    expect(result.records).toHaveLength(1)
    expect(result.records[0]?.investigation_id).toBe('PSI-999')
    expect(result.records[0]?.publications).toEqual([])
    expect(result.warnings).toContain('PSI-999: no investigation DOI')
  })

  it('rejects a non-array payload', () => {
    expect(() => validateDataset({ records: [] })).toThrow(
      DatasetValidationError,
    )
  })

  it('rejects duplicate investigation IDs', () => {
    expectValidationIssue(
      [baseRecord(), baseRecord()],
      /duplicate investigation_id: PSI-999/,
    )
  })

  it('rejects a publication that repeats the investigation DOI', () => {
    // Investigation DOIs are stored as doi.org URLs; comparison must still
    // detect a bare DOI repeated in a publication entry.
    expectValidationIssue(
      [
        baseRecord({
          investigation_doi: 'https://doi.org/10.1234/example',
          publications: [{ label: 'A paper', doi: '10.1234/example' }],
        }),
      ],
      /repeats the investigation DOI/,
    )
  })

  it('rejects a malformed investigation DOI', () => {
    expect(() =>
      validateDataset([baseRecord({ investigation_doi: 'not-a-doi' })]),
    ).toThrow(DatasetValidationError)
  })

  it('rejects an unknown relevance category', () => {
    expect(() =>
      validateDataset([baseRecord({ relevance_category: 'critical' })]),
    ).toThrow(DatasetValidationError)
  })
})

describe('ingestion', () => {
  it('validates the canonical dataset and reports exact counts', async () => {
    const summary = await ingestDataset({
      prisma,
      sourcePath: config.dataSourcePath,
      dryRun: true,
    })

    expect(summary.recordCount).toBe(133)
    expect(summary.publicationCount).toBe(1786)
    expect(summary.documentCount).toBe(30)
    expect(summary.archiveCount).toBe(22)
    expect(summary.datasetSha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('does not modify the source JSON file', async () => {
    const before = await sha256(config.dataSourcePath)

    const summary = await ingestDataset({
      prisma,
      sourcePath: config.dataSourcePath,
      dryRun: true,
    })

    const after = await sha256(config.dataSourcePath)

    expect(after).toBe(before)
    expect(summary.datasetSha256).toBe(before)
  })

  it('records the ingested dataset hash for provenance', async () => {
    const sourceHash = await sha256(config.dataSourcePath)
    const latestRun = await prisma.ingestionRun.findFirst({
      orderBy: { id: 'desc' },
    })

    expect(latestRun).not.toBeNull()
    expect(latestRun?.dataset_sha256).toBe(sourceHash)
    expect(latestRun?.record_count).toBe(133)
    expect(latestRun?.publication_count).toBe(1786)
    expect(latestRun?.document_count).toBe(30)
    expect(latestRun?.archive_count).toBe(22)
  })

  it('keeps every stored raw record parseable', async () => {
    const rows = await prisma.investigation.findMany({
      select: { investigation_id: true, raw_json: true },
    })

    expect(rows).toHaveLength(133)

    for (const row of rows) {
      expect(() => JSON.parse(row.raw_json)).not.toThrow()
    }
  })
})
