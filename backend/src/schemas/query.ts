import { z } from 'zod'

export const relevanceValues = ['direct', 'supporting', 'peripheral'] as const
export const extractionValues = ['success', 'incomplete', 'failed'] as const
export const sortValues = [
  'relevance',
  'title',
  'area',
  'project_type',
  'extraction',
  'publications',
] as const

export type RelevanceValue = (typeof relevanceValues)[number]
export type ExtractionValue = (typeof extractionValues)[number]
export type SortValue = (typeof sortValues)[number]

function splitCsv(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const raw = Array.isArray(value) ? value.join(',') : String(value)
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  return parts.length > 0 ? parts : undefined
}

function emptyToUndefined(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  const raw = Array.isArray(value) ? value.join(' ') : String(value)
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export const relevanceFilter = z.preprocess(
  splitCsv,
  z.array(z.enum(relevanceValues)).optional(),
)

export const extractionFilter = z.preprocess(
  splitCsv,
  z.array(z.enum(extractionValues)).optional(),
)

export const searchTerm = z.preprocess(
  emptyToUndefined,
  z.string().max(200).optional(),
)

export const pageSchema = z.coerce.number().int().min(1).default(1)
export const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(25)

export const investigationIdSchema = z
  .string({ error: 'An investigation ID is required.' })
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => /^PSI-\d+$/.test(value), {
    message: 'Investigation IDs look like PSI-123.',
  })

export const investigationListQuerySchema = z.object({
  q: searchTerm,
  relevance: relevanceFilter,
  area: z.preprocess(splitCsv, z.array(z.string().min(1)).optional()),
  project_type: z.preprocess(splitCsv, z.array(z.string().min(1)).optional()),
  status: extractionFilter,
  sort: z.enum(sortValues).default('relevance'),
  page: pageSchema,
  page_size: pageSizeSchema,
})

export type InvestigationListQuery = z.infer<
  typeof investigationListQuerySchema
>

export const publicationsQuerySchema = z.object({
  q: searchTerm,
  investigation: z.preprocess(
    emptyToUndefined,
    z.string().max(40).optional(),
  ),
  has_doi: z.preprocess(
    (value) =>
      value === 'true' ? true : value === 'false' ? false : undefined,
    z.boolean().optional(),
  ),
  view: z.enum(['grouped', 'entries']).default('grouped'),
  page: pageSchema,
  page_size: pageSizeSchema,
})

export type PublicationsQuery = z.infer<typeof publicationsQuerySchema>

export const documentsQuerySchema = z.object({
  q: searchTerm,
  investigation: z.preprocess(
    emptyToUndefined,
    z.string().max(40).optional(),
  ),
  page: pageSchema,
  page_size: pageSizeSchema,
})

export type DocumentsQuery = z.infer<typeof documentsQuerySchema>
