import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ExportCenterPage } from '@/pages/export-center'

describe('ExportCenterPage', () => {
  it('renders the export page header and live status badge', () => {
    render(
      <MemoryRouter>
        <ExportCenterPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Exports')).toBeInTheDocument()
    expect(screen.getByText(/Phase 6/i)).toBeInTheDocument()
    expect(screen.getByText(/Verified Dataset/i)).toBeInTheDocument()
  })

  it('renders download links for JSON and CSV', () => {
    render(
      <MemoryRouter>
        <ExportCenterPage />
      </MemoryRouter>,
    )

    const jsonLinks = screen.getAllByRole('link', { name: /json/i })
    expect(jsonLinks.length).toBeGreaterThan(0)
    expect(jsonLinks[0]).toHaveAttribute('href', expect.stringContaining('/export'))

    const csvLinks = screen.getAllByRole('link', { name: /csv/i })
    expect(csvLinks.length).toBeGreaterThan(0)
    expect(csvLinks[0]).toHaveAttribute('href', expect.stringContaining('/export'))
  })

  it('renders research presets and statistics export', () => {
    render(
      <MemoryRouter>
        <ExportCenterPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Direct Fire Safety Investigations')).toBeInTheDocument()
    expect(screen.getByText('Supporting Combustion Studies')).toBeInTheDocument()
    expect(screen.getByText('Research Statistics Export')).toBeInTheDocument()
    const statsLink = screen.getByRole('link', { name: /download statistics json/i })
    expect(statsLink).toHaveAttribute('href', expect.stringContaining('type=statistics'))
  })
})
