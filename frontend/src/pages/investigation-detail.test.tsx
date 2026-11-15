import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, getInvestigation } from '@/lib/api'
import { InvestigationDetailPage } from '@/pages/investigation-detail'
import type { InvestigationDetail } from '@/types/api'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return { ...actual, getInvestigation: vi.fn() }
})

const mockedGetInvestigation = vi.mocked(getInvestigation)

const record: InvestigationDetail = {
  investigation_id: 'PSI-25',
  title: 'Burning and Suppression of Solids - II',
  url: 'https://psi.nasa.gov/search/?q=PSI-25',
  research_area: 'Combustion Science',
  project_type: 'Microgravity Investigation',
  objectives: 'Study flame spread and extinction limits in low-velocity flow.',
  approach: 'Burn solid fuel samples in the Microgravity Science Glovebox.',
  hypothesis: '',
  impacts: '',
  keywords: 'Flame Spread     Fire Safety',
  keywords_list: ['Flame Spread', 'Fire Safety'],
  related: 'PSI-26',
  related_ids: ['PSI-26'],
  investigation_doi: 'https://doi.org/10.60555/bass-ii',
  scraper_doi_unverified: null,
  relevance_category: 'direct',
  relevance_score: 1,
  relevance_reason:
    "direct: title names explicit fire-safety work: 'burning and suppression'; fire terms in the title: 'suppression'",
  is_combustion_related: true,
  extraction_status: 'success',
  extraction_error: null,
  data_source: 'zip+scrape',
  acronym: 'BASS-II',
  sub_research_area: 'Spacecraft Fire Safety',
  managing_center: 'Glenn Research Center (GRC)',
  space_program: 'National Aeronautics and Space Administration (NASA)',
  proposal_title: null,
  investigation_start_date: '01-01-2010',
  investigation_end_date: '12-31-2022',
  study_submission_date: '31-Dec-2022',
  study_public_release_date: '31-Dec-2022',
  isa_metadata: {
    experiment_hardware: 'Microgravity Science Glovebox (MSG)',
    experiment_hardware_links: ['https://www1.grc.nasa.gov/space/iss-research/msg/'],
    flight_platform: 'International Space Station (ISS)',
    study_design_terms: ['Flame Spread', 'Fire Safety'],
    contacts: [
      {
        first_name: 'Paul',
        last_name: 'Ferkul',
        email: 'paul.ferkul@nasa.gov',
        roles: 'Co-Investigator (Co-I)',
      },
    ],
  },
  source_archive: {
    file: 'PSI-20_metadata_PSI-96_ACME BRE.zip',
    format: 'ISA-Tab',
    study_identifier: 'PSI-25',
    sha256: '629faf104a8ff0e8d335f2527c019e740380163ea7f74b8ad754ae71f7da2559',
    filename_matches_content: false,
  },
  publications: [
    {
      label: 'Evaluation of spacecraft smoke detector performance',
      url: 'https://doi.org/10.1016/j.firesaf.2018.04.004',
      doi: '10.1016/j.firesaf.2018.04.004',
      authors: ['Alice Example', 'Bob Example'],
      status: 'published',
      pubmed_id: '33654340',
    },
  ],
  files_and_documents: [],
}

function renderPage(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/investigations/${id}`]}>
      <Routes>
        <Route
          path="/investigations/:investigationId"
          element={<InvestigationDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('InvestigationDetailPage', () => {
  beforeEach(() => {
    mockedGetInvestigation.mockReset()
  })

  it('renders a loaded record without inventing missing fields', async () => {
    mockedGetInvestigation.mockResolvedValue(record)

    renderPage('psi-25')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Burning and Suppression of Solids - II',
      }),
    ).toBeInTheDocument()

    expect(mockedGetInvestigation).toHaveBeenCalledWith('PSI-25', expect.anything())

    expect(
      screen.getByText('Study flame spread and extinction limits in low-velocity flow.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Burn solid fuel samples in the Microgravity Science Glovebox/),
    ).toBeInTheDocument()

    expect(screen.getAllByText('Direct').length).toBeGreaterThan(0)
    expect(
      screen.getByText(/title names explicit fire-safety work/),
    ).toBeInTheDocument()

    const investigationDoi = screen.getByRole('link', {
      name: /10\.60555\/bass-ii/,
    })
    expect(investigationDoi).toHaveAttribute(
      'href',
      'https://doi.org/10.60555/bass-ii',
    )

    expect(
      screen.getByRole('link', { name: /PSI-26/ }),
    ).toHaveAttribute('href', '/investigations/PSI-26')

    expect(
      screen.getByRole('link', { name: /10\.1016\/j\.firesaf\.2018\.04\.004/ }),
    ).toHaveAttribute(
      'href',
      'https://doi.org/10.1016/j.firesaf.2018.04.004',
    )
    expect(
      screen.getByRole('link', { name: /PubMed 33654340/ }),
    ).toHaveAttribute('href', 'https://pubmed.ncbi.nlm.nih.gov/33654340/')

    expect(
      screen.getByText(/No documents were recorded for this investigation/),
    ).toBeInTheDocument()

    expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0)
  })

  it('distinguishes a missing record from an unreachable API', async () => {
    mockedGetInvestigation.mockRejectedValue(
      new ApiError('Investigation not found.', 404, 'not_found'),
    )

    renderPage('PSI-999')

    expect(
      await screen.findByText('No investigation PSI-999 in the dataset'),
    ).toBeInTheDocument()
  })

  it('rejects malformed identifiers without calling the API', () => {
    renderPage('PSI-abc')

    expect(
      screen.getByText('This is not a valid investigation ID'),
    ).toBeInTheDocument()
    expect(mockedGetInvestigation).not.toHaveBeenCalled()
  })
})
