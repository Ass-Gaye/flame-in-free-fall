/**
 * Display formatters.
 *
 * These helpers never invent a value: a missing number or date returns `null`
 * so the calling component can label it "Not recorded" instead of showing a
 * misleading zero or an empty string.
 */

import type { ExtractionStatus, RelevanceCategory } from '@/types/investigation'

const COUNT_FORMATTER = new Intl.NumberFormat('en-US')

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
})

export const relevanceLabels: Record<RelevanceCategory, string> = {
  direct: 'Direct',
  supporting: 'Supporting',
  peripheral: 'Peripheral',
}

export const extractionLabels: Record<ExtractionStatus, string> = {
  success: 'Complete',
  incomplete: 'Incomplete',
  failed: 'Failed',
}

export const dataSourceLabels: Record<string, string> = {
  scrape: 'Detail page scrape',
  'zip+scrape': 'ISA-Tab archive + scrape',
}

export function formatCount(value: number | null | undefined): string | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? COUNT_FORMATTER.format(value)
    : null
}

/** ISO dates are parsed in UTC so the displayed day cannot shift by timezone. */
export function formatIsoDate(value: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value ?? '').trim())
  if (!match) {
    return null
  }

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  )

  return Number.isNaN(date.getTime()) ? null : DATE_FORMATTER.format(date)
}

export function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : DATE_TIME_FORMATTER.format(date)
}

export function shortHash(
  value: string | null | undefined,
  visible = 12,
): string | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) {
    return null
  }
  return trimmed.length <= visible ? trimmed : `${trimmed.slice(0, visible)}…`
}

export function stripDoiPrefix(value: string | null | undefined): string | null {
  const bare = (value ?? '')
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')

  return bare.length > 0 ? bare : null
}

export function doiUrl(value: string | null | undefined): string | null {
  const bare = stripDoiPrefix(value)
  return bare ? `https://doi.org/${bare}` : null
}

/**
 * Publication links prefer the DOI resolver, then the URL recorded on the
 * dataset entry. Investigation DOIs are never passed through this helper.
 */
export function publicationUrl(publication: {
  doi?: string | null
  url?: string | null
}): string | null {
  return doiUrl(publication.doi) ?? ((publication.url ?? '').trim() || null)
}

export function pubmedUrl(value: string | null | undefined): string | null {
  const id = (value ?? '').trim()
  return id ? `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(id)}/` : null
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural
}

export function formatAuthorList(
  authors: string[],
  visible = 3,
): string | null {
  if (authors.length === 0) {
    return null
  }
  if (authors.length <= visible) {
    return authors.join(', ')
  }
  return `${authors.slice(0, visible).join(', ')} +${authors.length - visible} more`
}

/** Integer percentage of a total, kept only for bar widths. */
export function sharePercent(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return 0
  }
  return Math.round((part / total) * 100)
}

const SHARE_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * One-decimal percentage for display. Rounded integers made a 10/14/109 split
 * read as 8% + 11% + 82% = 101%, so labels keep the decimal that the source
 * counts support.
 */
export function formatShare(part: number, total: number): string | null {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return null
  }
  return `${SHARE_FORMATTER.format((part / total) * 100)}%`
}
