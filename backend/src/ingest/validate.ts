import { z } from 'zod'

import { DatasetValidationError } from '../lib/errors.js'

const DOI_PATTERN = /^10\.\d{4,9}\/\S+$/
const DOI_URL_PATTERN = /^https?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,9}\/\S+)$/i
const PSI_ID_PATTERN = /^PSI-\d+$/

/**
 * The dataset stores investigation DOIs as resolved `https://doi.org/...`
 * URLs and publication DOIs as bare identifiers. Normalize both to a bare,
 * lowercase DOI for comparison only; stored values are never rewritten.
 */
function normalizeDoi(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const urlMatch = DOI_URL_PATTERN.exec(trimmed)
  if (urlMatch) {
    const bare = urlMatch[1]
    return bare ? bare.toLowerCase() : null
  }

  return DOI_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null
}

function isDoiOrDoiUrl(value: string): boolean {
  return value.trim() === '' || normalizeDoi(value) !== null
}

const publicationSchema = z.object({
  label: z.string().default(''),
  url: z.string().default(''),
  doi: z.string().default(''),
  authors: z.array(z.string()).default([]),
  status: z.string().default(''),
  pubmed_id: z.string().default(''),
})

const documentSchema = z.object({
  label: z.string().default(''),
  url: z.string().default(''),
})

const linkSchema = z.object({
  label: z.string().default(''),
  url: z.string().default(''),
})

const sourceArchiveSchema = z.object({
  file: z.string(),
  format: z.string(),
  study_identifier: z.string(),
  sha256: z.string(),
  filename_matches_content: z.boolean(),
})

const recordSchema = z.object({
  investigation_id: z.string().regex(PSI_ID_PATTERN),
  title: z.string().min(1),
  url: z.string().min(1),
  research_area: z.string().min(1),
  project_type: z.string().min(1),

  objectives: z.string().default(''),
  approach: z.string().default(''),
  hypothesis: z.string().default(''),
  impacts: z.string().default(''),
  keywords: z.string().default(''),
  related: z.string().default(''),
  detail_text: z.string().default(''),

  investigation_doi: z
    .string()
    .default('')
    .refine(isDoiOrDoiUrl, {
      message: 'investigation_doi must be empty, a DOI, or a doi.org URL',
    }),
  scraper_doi_unverified: z.string().default(''),

  relevance_category: z.enum(['direct', 'supporting', 'peripheral']),
  relevance_score: z.number().finite().min(0).max(1),
  relevance_reason: z.string().min(1),
  is_combustion_related: z.boolean(),

  extraction_status: z.enum(['success', 'incomplete', 'failed']),
  extraction_error: z.string().default(''),
  data_source: z.enum(['scrape', 'zip+scrape']),

  publications: z.array(publicationSchema).default([]),
  files_and_documents: z.array(documentSchema).default([]),
  all_links: z.array(linkSchema).default([]),

  isa_metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  source_archive: sourceArchiveSchema.nullable().optional(),
})

const datasetSchema = z.array(recordSchema)

export type DatasetRecord = z.infer<typeof recordSchema>

export interface ValidatedDataset {
  records: DatasetRecord[]
  rawRecords: unknown[]
  warnings: string[]
}

function formatIssue(path: readonly PropertyKey[], message: string): string {
  const location = path.length > 0 ? path.join('.') : '(root)'
  return `${location}: ${message}`
}

export function validateDataset(input: unknown): ValidatedDataset {
  if (!Array.isArray(input)) {
    throw new DatasetValidationError(['(root): dataset must be a JSON array'])
  }

  const parsed = datasetSchema.safeParse(input)

  if (!parsed.success) {
    throw new DatasetValidationError(
      parsed.error.issues.map((issue) =>
        formatIssue(issue.path, issue.message),
      ),
    )
  }

  const records = parsed.data
  const issues: string[] = []
  const warnings: string[] = []
  const seenIds = new Set<string>()

  for (const record of records) {
    if (seenIds.has(record.investigation_id)) {
      issues.push(`duplicate investigation_id: ${record.investigation_id}`)
    }
    seenIds.add(record.investigation_id)

    const investigationDoi = normalizeDoi(record.investigation_doi)
    if (investigationDoi) {
      for (const publication of record.publications) {
        const values = [publication.doi, publication.label]
          .map(normalizeDoi)
          .filter((value): value is string => value !== null)

        if (values.includes(investigationDoi)) {
          issues.push(
            `${record.investigation_id}: publication entry repeats the investigation DOI (${investigationDoi})`,
          )
        }
      }
    }

    if (!record.investigation_doi.trim()) {
      warnings.push(`${record.investigation_id}: no investigation DOI`)
    }
    if (record.publications.length === 0) {
      warnings.push(`${record.investigation_id}: no publication entries`)
    }
    if (record.extraction_status !== 'success') {
      warnings.push(
        `${record.investigation_id}: extraction ${record.extraction_status}`,
      )
    }
  }

  if (issues.length > 0) {
    throw new DatasetValidationError(issues)
  }

  return {
    records,
    rawRecords: input,
    warnings,
  }
}
