import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'

import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'

const app = createApp()

afterAll(async () => {
  await prisma.$disconnect()
})

describe('GET /api', () => {
  it('advertises the read-only endpoints', async () => {
    const response = await request(app).get('/api').expect(200)

    expect(response.body.read_only).toBe(true)
    expect(response.body.endpoints).toContain('GET /api/investigations')
    expect(response.body.endpoints).toContain('GET /api/statistics')
  })
})

describe('GET /api/health', () => {
  it('reports a connected database and dataset provenance', async () => {
    const response = await request(app).get('/api/health').expect(200)

    expect(response.body.status).toBe('ok')
    expect(response.body.database).toEqual({
      provider: 'sqlite',
      connected: true,
    })
    expect(response.body.investigations_loaded).toBe(133)
    expect(response.body.dataset.record_count).toBe(133)
    expect(response.body.dataset.dataset_sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(typeof response.body.dataset.ingested_at).toBe('string')
  })
})

describe('GET /api/investigations', () => {
  it('returns the first page in relevance order', async () => {
    const response = await request(app).get('/api/investigations').expect(200)

    expect(response.body.pagination).toEqual({
      page: 1,
      page_size: 25,
      total: 133,
      total_pages: 6,
    })
    expect(response.body.items).toHaveLength(25)

    const first = response.body.items[0]
    expect(first).toMatchObject({
      relevance_category: 'direct',
      is_combustion_related: expect.any(Boolean),
    })
    expect(first.publication_count).toBeGreaterThanOrEqual(0)
    expect(first.document_count).toBeGreaterThanOrEqual(0)
  })

  it('pages through the dataset without overlap', async () => {
    const pageOne = await request(app)
      .get('/api/investigations?page=1&page_size=50')
      .expect(200)
    const pageTwo = await request(app)
      .get('/api/investigations?page=2&page_size=50')
      .expect(200)
    const pageThree = await request(app)
      .get('/api/investigations?page=3&page_size=50')
      .expect(200)

    const ids = [...pageOne.body.items, ...pageTwo.body.items].map(
      (item: { investigation_id: string }) => item.investigation_id,
    )

    expect(pageOne.body.items).toHaveLength(50)
    expect(pageTwo.body.items).toHaveLength(50)
    expect(pageThree.body.items).toHaveLength(33)
    expect(new Set(ids).size).toBe(100)
    expect(pageThree.body.pagination.total_pages).toBe(3)
  })

  it('filters by a single research area', async () => {
    const response = await request(app)
      .get('/api/investigations?area=Combustion%20Science')
      .expect(200)

    expect(response.body.pagination.total).toBe(24)
    expect(
      response.body.items.every(
        (item: { research_area: string }) =>
          item.research_area === 'Combustion Science',
      ),
    ).toBe(true)
  })

  it('accepts comma-separated relevance filters', async () => {
    const response = await request(app)
      .get('/api/investigations?relevance=direct,supporting')
      .expect(200)

    expect(response.body.pagination.total).toBe(24)
    expect(
      response.body.items.every(
        (item: { relevance_category: string }) =>
          item.relevance_category === 'direct' ||
          item.relevance_category === 'supporting',
      ),
    ).toBe(true)
  })

  it('filters by extraction status', async () => {
    const response = await request(app)
      .get('/api/investigations?status=incomplete')
      .expect(200)

    expect(response.body.pagination.total).toBe(4)
    const ids = response.body.items.map(
      (item: { investigation_id: string }) => item.investigation_id,
    )
    expect(ids.sort()).toEqual(['PSI-165', 'PSI-168', 'PSI-184', 'PSI-34'])
  })

  it('ranks an exact ID search first', async () => {
    const response = await request(app)
      .get('/api/investigations?q=PSI-34')
      .expect(200)

    expect(response.body.pagination.total).toBeGreaterThan(0)
    expect(response.body.items[0].investigation_id).toBe('PSI-34')
  })

  it('matches searches case-insensitively', async () => {
    const response = await request(app)
      .get('/api/investigations?q=psi-34')
      .expect(200)

    expect(response.body.items[0].investigation_id).toBe('PSI-34')
  })

  it('searches titles and body text', async () => {
    const response = await request(app)
      .get('/api/investigations?q=combustion')
      .expect(200)

    expect(response.body.pagination.total).toBeGreaterThan(0)
  })

  it('returns an empty page for a search with no matches', async () => {
    const response = await request(app)
      .get('/api/investigations?q=nonexistent-terminology-xyz')
      .expect(200)

    expect(response.body.pagination).toEqual({
      page: 1,
      page_size: 25,
      total: 0,
      total_pages: 1,
    })
    expect(response.body.items).toEqual([])
  })

  it('sorts by publication count', async () => {
    const response = await request(app)
      .get('/api/investigations?sort=publications&page_size=10')
      .expect(200)

    const counts = response.body.items.map(
      (item: { publication_count: number }) => item.publication_count,
    )
    expect(counts).toEqual([...counts].sort((a: number, b: number) => b - a))
  })

  it('rejects unknown sort values', async () => {
    const response = await request(app)
      .get('/api/investigations?sort=popularity')
      .expect(400)

    expect(response.body.error.code).toBe('validation_error')
  })

  it('rejects out-of-range paging values', async () => {
    await request(app).get('/api/investigations?page=0').expect(400)
    await request(app).get('/api/investigations?page_size=101').expect(400)
  })
})

describe('GET /api/investigations/:id', () => {
  it('returns the full investigation record', async () => {
    const response = await request(app)
      .get('/api/investigations/PSI-34')
      .expect(200)

    expect(response.body.investigation_id).toBe('PSI-34')
    expect(response.body.extraction_status).toBe('incomplete')
    expect(response.body.title.length).toBeGreaterThan(0)
    expect(Array.isArray(response.body.publications)).toBe(true)
    expect(Array.isArray(response.body.files_and_documents)).toBe(true)
    expect(Array.isArray(response.body.keywords_list)).toBe(true)
    expect(Array.isArray(response.body.related_ids)).toBe(true)
  })

  it('accepts a lowercase ID', async () => {
    const response = await request(app)
      .get('/api/investigations/psi-34')
      .expect(200)

    expect(response.body.investigation_id).toBe('PSI-34')
  })

  it('returns 404 for an unknown ID', async () => {
    const response = await request(app)
      .get('/api/investigations/PSI-999999')
      .expect(404)

    expect(response.body.error.code).toBe('investigation_not_found')
  })

  it('returns 400 for a malformed ID', async () => {
    const response = await request(app)
      .get('/api/investigations/not-an-id')
      .expect(400)

    expect(response.body.error.code).toBe('validation_error')
  })
})

describe('GET /api/statistics', () => {
  it('reports verified totals and coverage', async () => {
    const response = await request(app).get('/api/statistics').expect(200)

    expect(response.body.totals).toEqual({
      investigations: 133,
      publications: 1786,
      documents: 30,
      source_archives: 22,
      research_areas: 6,
    })
    expect(response.body.publications).toEqual({
      entries: 1786,
      with_doi: 273,
      distinct_dois: 228,
      distinct_labels: 1484,
    })
    expect(response.body.coverage).toEqual({
      with_investigation_doi: 131,
      without_investigation_doi: 2,
      with_publications: 122,
      without_publications: 11,
      with_documents: 28,
      without_documents: 105,
    })
    expect(response.body.dataset.record_count).toBe(133)
  })

  it('breaks down relevance and research areas', async () => {
    const response = await request(app).get('/api/statistics').expect(200)

    const relevance = Object.fromEntries(
      response.body.by_relevance.map(
        (entry: { value: string; count: number }) => [entry.value, entry.count],
      ),
    )
    expect(relevance).toEqual({ direct: 10, supporting: 14, peripheral: 109 })

    const areas = Object.fromEntries(
      response.body.by_research_area.map(
        (entry: { value: string; count: number }) => [entry.value, entry.count],
      ),
    )
    expect(areas).toEqual({
      'Materials Science': 35,
      'Complex Fluids - Soft Matter': 34,
      'Fluid Physics': 27,
      'Combustion Science': 24,
      Biophysics: 7,
      'Fundamental Physics': 6,
    })
  })
})

describe('GET /api/filters', () => {
  it('returns filter values with counts', async () => {
    const response = await request(app).get('/api/filters').expect(200)

    expect(response.body.relevance).toEqual([
      { value: 'direct', count: 10 },
      { value: 'supporting', count: 14 },
      { value: 'peripheral', count: 109 },
    ])
    expect(
      response.body.research_area.reduce(
        (total: number, entry: { count: number }) => total + entry.count,
        0,
      ),
    ).toBe(133)
    expect(response.body.extraction_status).toContainEqual({
      value: 'incomplete',
      count: 4,
    })
  })
})

describe('GET /api/publications', () => {
  it('groups entries by DOI or normalized label', async () => {
    const response = await request(app)
      .get('/api/publications?page_size=100')
      .expect(200)

    expect(response.body.view).toBe('grouped')
    expect(response.body.pagination.total).toBe(1491)
    expect(response.body.items).toHaveLength(100)

    for (const item of response.body.items) {
      if (item.doi) {
        expect(item.key).toBe(`doi:${item.doi.toLowerCase()}`)
      } else {
        expect(item.key).toMatch(/^label:/)
      }
      expect(item.entry_count).toBeGreaterThanOrEqual(1)
      expect(item.investigations.length).toBeGreaterThanOrEqual(1)
      expect(item.url === null || /^https?:\/\//.test(item.url)).toBe(true)
      expect(item.pubmed_id === null || typeof item.pubmed_id === 'string').toBe(
        true,
      )
    }
  })

  it('preserves total entry counts across all groups', async () => {
    const totals = { groups: 0, entries: 0 }

    for (let page = 1; page <= 15; page += 1) {
      const response = await request(app)
        .get(`/api/publications?page=${page}&page_size=100`)
        .expect(200)

      totals.groups += response.body.items.length
      totals.entries += response.body.items.reduce(
        (sum: number, item: { entry_count: number }) => sum + item.entry_count,
        0,
      )

      if (page >= response.body.pagination.total_pages) {
        break
      }
    }

    expect(totals).toEqual({ groups: 1491, entries: 1786 })
  })

  it('carries a representative URL and PubMed ID on grouped publications', async () => {
    const totals = { with_url: 0, label_only_with_url: 0, with_pubmed: 0 }

    for (let page = 1; page <= 15; page += 1) {
      const response = await request(app)
        .get(`/api/publications?page=${page}&page_size=100`)
        .expect(200)

      for (const item of response.body.items) {
        if (item.url) {
          totals.with_url += 1
          if (!item.doi) {
            totals.label_only_with_url += 1
          }
        }
        if (item.pubmed_id) {
          totals.with_pubmed += 1
        }
      }

      if (page >= response.body.pagination.total_pages) {
        break
      }
    }

    expect(totals).toEqual({
      with_url: 1434,
      label_only_with_url: 1206,
      with_pubmed: 6,
    })
  })

  it('returns raw entries when view=entries', async () => {
    const response = await request(app)
      .get('/api/publications?view=entries&page_size=10')
      .expect(200)

    expect(response.body.view).toBe('entries')
    expect(response.body.pagination.total).toBe(1786)
    expect(response.body.items).toHaveLength(10)
    expect(response.body.items[0]).toMatchObject({
      investigation_id: expect.stringMatching(/^PSI-\d+$/),
      label: expect.any(String),
      authors: expect.any(Array),
    })
  })

  it('filters entries by DOI availability', async () => {
    const withDoi = await request(app)
      .get('/api/publications?view=entries&has_doi=true&page_size=1')
      .expect(200)
    const withoutDoi = await request(app)
      .get('/api/publications?view=entries&has_doi=false&page_size=1')
      .expect(200)

    expect(withDoi.body.pagination.total).toBe(273)
    expect(withoutDoi.body.pagination.total).toBe(1513)
    expect(withDoi.body.items[0].doi).toMatch(/^10\./)
  })

  it('filters entries by investigation', async () => {
    const detail = await request(app)
      .get('/api/investigations/PSI-34')
      .expect(200)

    const response = await request(app)
      .get('/api/publications?view=entries&investigation=PSI-34&page_size=100')
      .expect(200)

    expect(response.body.pagination.total).toBe(detail.body.publications.length)
    expect(
      response.body.items.every(
        (item: { investigation_id: string }) =>
          item.investigation_id === 'PSI-34',
      ),
    ).toBe(true)
  })

  it('searches publication labels and linked investigation text', async () => {
    const first = await request(app)
      .get('/api/publications?view=entries&page_size=1')
      .expect(200)
    const investigationId: string = first.body.items[0].investigation_id

    const response = await request(app)
      .get(`/api/publications?view=entries&q=${investigationId}&page_size=100`)
      .expect(200)

    expect(response.body.pagination.total).toBeGreaterThan(0)
    expect(
      response.body.items.every(
        (item: { investigation_id: string }) =>
          item.investigation_id === investigationId,
      ),
    ).toBe(true)
  })
})

describe('GET /api/documents', () => {
  it('lists all documents with investigation context', async () => {
    const response = await request(app)
      .get('/api/documents?page_size=100')
      .expect(200)

    expect(response.body.pagination.total).toBe(30)
    expect(response.body.items).toHaveLength(30)
    expect(response.body.items[0]).toMatchObject({
      investigation_id: expect.stringMatching(/^PSI-\d+$/),
      label: expect.any(String),
      url: expect.stringMatching(/^https?:\/\//),
    })
  })

  it('filters documents by investigation', async () => {
    const first = await request(app)
      .get('/api/documents?page_size=1')
      .expect(200)
    const investigationId: string = first.body.items[0].investigation_id

    const response = await request(app)
      .get(`/api/documents?investigation=${investigationId}`)
      .expect(200)

    expect(response.body.pagination.total).toBeGreaterThan(0)
    expect(
      response.body.items.every(
        (item: { investigation_id: string }) =>
          item.investigation_id === investigationId,
      ),
    ).toBe(true)
  })

  it('searches document labels', async () => {
    const response = await request(app)
      .get('/api/documents?q=a')
      .expect(200)

    expect(response.body.pagination.total).toBeGreaterThan(0)
  })
})

describe('GET /api/export', () => {
  it('exports the validated dataset as JSON', async () => {
    const response = await request(app)
      .get('/api/export?format=json')
      .expect(200)

    expect(response.headers['content-type']).toContain('application/json')
    expect(response.headers['content-disposition']).toContain('flame-in-freefall-dataset.json')
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body).toHaveLength(133)
  })

  it('exports the validated dataset as CSV', async () => {
    const response = await request(app)
      .get('/api/export?format=csv')
      .expect(200)

    expect(response.headers['content-type']).toContain('text/csv')
    expect(response.headers['content-disposition']).toContain('flame-in-freefall-dataset.csv')
    expect(response.text).toContain('investigation_id')
    expect(response.text).toContain('PSI-1')
  })

  it('exports filtered investigations as JSON with matching count', async () => {
    const response = await request(app)
      .get('/api/export?format=json&relevance=direct')
      .expect(200)

    expect(response.headers['content-type']).toContain('application/json')
    expect(response.headers['content-disposition']).toContain('flame-in-freefall-filtered.json')
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body).toHaveLength(10)
    expect(response.body.every((item: any) => item.relevance_category === 'direct')).toBe(true)
  })

  it('exports filtered investigations as CSV with matching row count', async () => {
    const response = await request(app)
      .get('/api/export?format=csv&relevance=direct')
      .expect(200)

    expect(response.headers['content-type']).toContain('text/csv')
    expect(response.headers['content-disposition']).toContain('flame-in-freefall-filtered.csv')
    expect(response.text).toContain('PSI-68')
    expect(response.text).toContain('direct')
  })

  it('exports filtered investigations by search query', async () => {
    const response = await request(app)
      .get('/api/export?format=json&q=cool+flame')
      .expect(200)

    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.length).toBeGreaterThan(0)
    expect(response.body.some((item: any) => item.investigation_id === 'PSI-117')).toBe(true)
  })

  it('exports a single investigation record as JSON', async () => {
    const response = await request(app)
      .get('/api/export?format=json&id=PSI-117')
      .expect(200)

    expect(response.headers['content-disposition']).toContain('flame-in-freefall-PSI-117.json')
    expect(response.body.investigation_id).toBe('PSI-117')
    expect(response.body.title).toContain('Cool Flame')
  })

  it('exports a single investigation record as CSV', async () => {
    const response = await request(app)
      .get('/api/export?format=csv&id=PSI-117')
      .expect(200)

    expect(response.headers['content-disposition']).toContain('flame-in-freefall-PSI-117.csv')
    expect(response.text).toContain('PSI-117')
  })

  it('returns 404 when exporting an unknown investigation ID', async () => {
    const response = await request(app)
      .get('/api/export?format=json&id=PSI-99999')
      .expect(404)

    expect(response.body.error.code).toBe('investigation_not_found')
  })

  it('exports dataset research statistics as JSON', async () => {
    const response = await request(app)
      .get('/api/export?type=statistics')
      .expect(200)

    expect(response.headers['content-type']).toContain('application/json')
    expect(response.headers['content-disposition']).toContain('flame-in-freefall-statistics.json')
    expect(response.body.totals.investigations).toBe(133)
    const directCount = response.body.by_relevance.find((item: any) => item.value === 'direct')?.count
    expect(directCount).toBe(10)
  })

  it('rejects unsupported formats with 400', async () => {
    const response = await request(app)
      .get('/api/export?format=xml')
      .expect(400)

    expect(response.body.error.code).toBe('validation_error')
  })
})

describe('unknown routes', () => {
  it('returns a structured 404', async () => {
    const response = await request(app).get('/api/unknown').expect(404)

    expect(response.body.error.code).toBe('route_not_found')
  })
})
