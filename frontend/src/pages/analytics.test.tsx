import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getStatistics } from '@/lib/api'
import { clearApiCache } from '@/lib/api-hooks'
import { AnalyticsPage } from '@/pages/analytics'
import type { StatisticsResponse } from '@/types/api'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    getStatistics: vi.fn(),
  }
})

const mockedGetStatistics = vi.mocked(getStatistics)

const mockStats: StatisticsResponse = {
  generated_at: '2026-11-15T04:00:00.000Z',
  dataset: {
    record_count: 133,
    dataset_sha256: '26f712c40f1e1234567890abcdef',
    ingested_at: '2026-11-15T04:00:00.000Z',
  },
  totals: {
    investigations: 133,
    publications: 1786,
    documents: 30,
    source_archives: 22,
    research_areas: 6,
  },
  by_relevance: [
    { value: 'direct', count: 10 },
    { value: 'supporting', count: 14 },
    { value: 'peripheral', count: 109 },
  ],
  by_research_area: [
    { value: 'Materials Science', count: 35 },
    { value: 'Complex Fluids - Soft Matter', count: 34 },
    { value: 'Fluid Physics', count: 27 },
    { value: 'Combustion Science', count: 24 },
    { value: 'Biophysics', count: 7 },
    { value: 'Fundamental Physics', count: 6 },
  ],
  by_project_type: [
    { value: 'Microgravity Investigation', count: 114 },
    { value: 'Ground Investigation', count: 19 },
  ],
  by_extraction_status: [
    { value: 'success', count: 129 },
    { value: 'incomplete', count: 4 },
  ],
  by_data_source: [
    { value: 'scrape', count: 111 },
    { value: 'zip+scrape', count: 22 },
  ],
  publications: {
    entries: 1786,
    with_doi: 273,
    distinct_dois: 228,
    distinct_labels: 1484,
  },
  coverage: {
    with_investigation_doi: 131,
    without_investigation_doi: 2,
    with_publications: 122,
    without_publications: 11,
    with_documents: 28,
    without_documents: 105,
  },
}

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearApiCache()
    mockedGetStatistics.mockResolvedValue(mockStats)
  })

  it('renders page header and live status badge', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Research Intelligence & Analytics')).toBeInTheDocument()
    expect(screen.getByText('Grounded Dataset Provenance')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Phase 4 · Live Analytics')).toBeInTheDocument()
    })
  })

  it('renders top KPI cards with accurate numbers', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('133')).toBeInTheDocument()
      expect(screen.getByText('Direct Fire Safety')).toBeInTheDocument()
      expect(screen.getByText('Combustion Science')).toBeInTheDocument()
      expect(screen.getByText('1,786')).toBeInTheDocument()
    })
  })

  it('renders relevance, research area, and project type distributions with verified values', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Relevance Distribution')).toBeInTheDocument()
      expect(screen.getByText('Research Disciplines & Platforms')).toBeInTheDocument()
      expect(screen.getByText('Materials Science')).toBeInTheDocument()
      expect(screen.getByText('Focal Domain')).toBeInTheDocument()
      expect(screen.getByText('Microgravity Investigation')).toBeInTheDocument()
      expect(screen.getByText('Ground Investigation')).toBeInTheDocument()
      expect(screen.getByText('114')).toBeInTheDocument()
      expect(screen.getByText('19')).toBeInTheDocument()
    })
  })

  it('renders completeness and provenance coverage metrics', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Completeness & Provenance Coverage')).toBeInTheDocument()
      expect(screen.getByText('Investigation DOIs')).toBeInTheDocument()
      expect(screen.getByText('Associated Publications')).toBeInTheDocument()
      expect(screen.getByText('Extraction Completeness')).toBeInTheDocument()
      expect(screen.getByText('Hardware & Facility Documents')).toBeInTheDocument()
      expect(screen.getByText('ISA-Tab Metadata Archives')).toBeInTheDocument()
    })
  })

  it('renders recurring research themes with supporting NASA investigations', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Recurring Research Themes')).toBeInTheDocument()
      expect(
        screen.getByText('Spacecraft Fire Safety & Material Flammability (SAFFIRE)'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Solid Fuel Burning and Suppression (BASS Series)'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Droplet Combustion & Cool Flame Physics (FLEX Series)'),
      ).toBeInTheDocument()
      expect(screen.getAllByText('PSI-98').length).toBeGreaterThan(0)
      expect(screen.getAllByText('PSI-25').length).toBeGreaterThan(0)
      expect(screen.getAllByText('PSI-68').length).toBeGreaterThan(0)
      expect(screen.getAllByText('PSI-10').length).toBeGreaterThan(0)
      expect(screen.getAllByText('PSI-21').length).toBeGreaterThan(0)
      expect(screen.getAllByText('PSI-159').length).toBeGreaterThan(0)
    })
  })

  it('renders evidence-based research gaps with supporting citations and limitations', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByText('Evidence-Based Research Gap Observations'),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Disparity between Droplet Combustion and Porous/Smoldering Solid Fuels',
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Document-Link Coverage Disparity in Portal Records'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Unresolved Incomplete Record Extractions'),
      ).toBeInTheDocument()
    })
  })

  it('handles API error state gracefully with retry button', async () => {
    mockedGetStatistics.mockRejectedValueOnce(
      new Error('Failed to connect to backend'),
    )

    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Analytics data unavailable')).toBeInTheDocument()
      expect(screen.getByText('API Offline')).toBeInTheDocument()
    })

    mockedGetStatistics.mockResolvedValueOnce(mockStats)
    const retryButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText('Relevance Distribution')).toBeInTheDocument()
    })
  })
})
