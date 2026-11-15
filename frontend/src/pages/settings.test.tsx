import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { DatasetStatusProvider } from '@/lib/dataset-status'
import { ThemeProvider } from '@/lib/theme'
import { SettingsPage } from '@/pages/settings'

// Mock api calls for getAiStatus and getHealth
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    getHealth: vi.fn().mockResolvedValue({
      status: 'ok',
      service: 'flame-in-freefall-backend',
      version: '0.1.0',
      database: { connected: true, provider: 'sqlite' },
      dataset: {
        investigations_loaded: 133,
        dataset_sha256: '26f712c40f1e',
        ingested_at: '2026-11-15T00:52:24Z',
      },
    }),
    getAiStatus: vi.fn().mockResolvedValue({
      provider: 'ollama',
      available: true,
      model: 'gemma4:e2b',
      configured: true,
      baseUrl: 'http://localhost:11434',
    }),
  }
})

function renderSettings() {
  return render(
    <ThemeProvider>
      <DatasetStatusProvider>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </DatasetStatusProvider>
    </ThemeProvider>,
  )
}

describe('SettingsPage', () => {
  it('renders settings page header and sections', async () => {
    await act(async () => {
      renderSettings()
    })

    expect(screen.getByText('Appearance and configuration')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('State gallery')).toBeInTheDocument()
    expect(screen.getByText('Dataset')).toBeInTheDocument()
    expect(screen.getByText('AI assistant')).toBeInTheDocument()
    expect(screen.getByText('About this build')).toBeInTheDocument()
  })

  it('allows switching theme options', async () => {
    await act(async () => {
      renderSettings()
    })

    const darkRadio = screen.getByRole('radio', { name: /dark/i })
    expect(darkRadio).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(darkRadio)
    })
    expect(darkRadio).toHaveAttribute('aria-checked', 'true')
  })

  it('allows previewing empty, loading, and error states in the gallery', async () => {
    await act(async () => {
      renderSettings()
    })

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()

    const loadingBtn = screen.getByRole('button', { name: 'Loading' })
    await act(async () => {
      fireEvent.click(loadingBtn)
    })
    expect(screen.getByText('Loading investigation preview')).toBeInTheDocument()

    const errorBtn = screen.getByRole('button', { name: 'Error' })
    await act(async () => {
      fireEvent.click(errorBtn)
    })
    expect(screen.getByText('Preview error state')).toBeInTheDocument()
  })
})
