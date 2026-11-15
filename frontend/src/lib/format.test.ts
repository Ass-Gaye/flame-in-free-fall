import { describe, expect, it } from 'vitest'

import {
  doiUrl,
  formatAuthorList,
  formatCount,
  formatIsoDate,
  formatShare,
  formatTimestamp,
  pubmedUrl,
  publicationUrl,
  sharePercent,
  shortHash,
  stripDoiPrefix,
} from '@/lib/format'

describe('formatCount', () => {
  it('formats numbers with grouping', () => {
    expect(formatCount(1786)).toBe('1,786')
    expect(formatCount(0)).toBe('0')
  })

  it('returns null for missing values so callers can label them', () => {
    expect(formatCount(null)).toBeNull()
    expect(formatCount(undefined)).toBeNull()
    expect(formatCount(Number.NaN)).toBeNull()
  })
})

describe('dates', () => {
  it('renders ISO dates in UTC without shifting the day', () => {
    expect(formatIsoDate('2020-01-01')).toBe('Jan 1, 2020')
  })

  it('rejects ISA-Tab dates so they are shown verbatim elsewhere', () => {
    expect(formatIsoDate('31-Dec-2022')).toBeNull()
    expect(formatIsoDate('')).toBeNull()
  })

  it('formats ingestion timestamps', () => {
    expect(formatTimestamp('2026-11-15T00:52:24.000Z')).toContain('2026')
    expect(formatTimestamp('not a date')).toBeNull()
    expect(formatTimestamp(null)).toBeNull()
  })
})

describe('DOI handling', () => {
  it('strips resolver prefixes and the doi: scheme', () => {
    expect(stripDoiPrefix('https://doi.org/10.1016/j.proci.2022.07.094')).toBe(
      '10.1016/j.proci.2022.07.094',
    )
    expect(stripDoiPrefix('http://dx.doi.org/10.1038/s41526-025-00500-0')).toBe(
      '10.1038/s41526-025-00500-0',
    )
    expect(stripDoiPrefix('doi: 10.1196/annals.1362.038')).toBe(
      '10.1196/annals.1362.038',
    )
    expect(stripDoiPrefix('   ')).toBeNull()
  })

  it('builds resolver URLs and PubMed links', () => {
    expect(doiUrl('10.1016/j.proci.2022.07.094')).toBe(
      'https://doi.org/10.1016/j.proci.2022.07.094',
    )
    expect(doiUrl(null)).toBeNull()
    expect(pubmedUrl('33654340')).toBe(
      'https://pubmed.ncbi.nlm.nih.gov/33654340/',
    )
    expect(pubmedUrl('')).toBeNull()
  })

  it('prefers the DOI resolver over the recorded entry URL', () => {
    expect(
      publicationUrl({
        doi: '10.1016/j.proci.2022.07.094',
        url: 'https://example.org/paper',
      }),
    ).toBe('https://doi.org/10.1016/j.proci.2022.07.094')

    expect(
      publicationUrl({
        doi: null,
        url: 'https://ntrs.nasa.gov/api/citations/20170012377',
      }),
    ).toBe('https://ntrs.nasa.gov/api/citations/20170012377')

    expect(publicationUrl({ doi: null, url: '   ' })).toBeNull()
  })
})

describe('display helpers', () => {
  it('shortens hashes without losing the full value at the call site', () => {
    expect(shortHash('26f712c40f1e8a072c522e1b6b2b83aa', 12)).toBe(
      '26f712c40f1e…',
    )
    expect(shortHash('abc', 12)).toBe('abc')
    expect(shortHash(null)).toBeNull()
  })

  it('truncates long author lists', () => {
    expect(formatAuthorList([])).toBeNull()
    expect(formatAuthorList(['A', 'B'])).toBe('A, B')
    expect(formatAuthorList(['A', 'B', 'C', 'D', 'E'], 3)).toBe(
      'A, B, C +2 more',
    )
  })

  it('guards percentage arithmetic against zero totals', () => {
    expect(sharePercent(10, 133)).toBe(8)
    expect(sharePercent(5, 0)).toBe(0)
    expect(formatShare(5, 0)).toBeNull()
  })

  it('labels shares with one decimal so rows do not add up past 100%', () => {
    expect(formatShare(10, 133)).toBe('7.5%')
    expect(formatShare(14, 133)).toBe('10.5%')
    expect(formatShare(109, 133)).toBe('82.0%')
    expect(formatShare(133, 133)).toBe('100.0%')
  })
})
