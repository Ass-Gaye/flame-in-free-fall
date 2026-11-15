import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAiStatus, queryAiAssistant } from '@/lib/api'
import { clearApiCache } from '@/lib/api-hooks'
import { AssistantPage } from '@/pages/assistant'
import type { AiQueryResponse, AiStatusResponse } from '@/types/api'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    getAiStatus: vi.fn(),
    queryAiAssistant: vi.fn(),
  }
})

const mockedGetAiStatus = vi.mocked(getAiStatus)
const mockedQueryAiAssistant = vi.mocked(queryAiAssistant)

const mockStatus: AiStatusResponse = {
  success: true,
  provider: 'ollama',
  configured: true,
  available: true,
  model: 'gemma4:e2b',
}

const mockResponse: AiQueryResponse = {
  success: true,
  answer: 'Based on [PSI-10], the investigation evaluates flame behavior in microgravity.',
  provider: 'ollama',
  model: 'gemma4:e2b',
  investigations: [
    {
      investigation_id: 'PSI-10',
      title: 'Burning and Suppression of Solids - II',
      url: 'https://psi.nasa.gov/psi-10',
      relevance_category: 'direct',
      research_area: 'Combustion Science',
    },
  ],
}

describe('AssistantPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearApiCache()
    mockedGetAiStatus.mockResolvedValue(mockStatus)
    mockedQueryAiAssistant.mockResolvedValue(mockResponse)
  })

  it('renders the assistant header and active provider badge', async () => {
    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('AI Research Assistant')).toBeInTheDocument()
    expect(screen.getByText('Grounding Contract')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/ollama \(gemma4:e2b\)/i)).toBeInTheDocument()
    })
  })

  it('submits a user question and renders the answer with citation link', async () => {
    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>,
    )

    const textarea = screen.getByLabelText('Research question')
    fireEvent.change(textarea, { target: { value: 'How does flame spread work?' } })

    const sendButton = screen.getByRole('button', { name: /send/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(mockedQueryAiAssistant).toHaveBeenCalledWith('How does flame spread work?')
      expect(screen.getByText(/Based on \[PSI-10\]/)).toBeInTheDocument()
      expect(screen.getByText('PSI-10')).toBeInTheDocument()
      expect(screen.getByText('Burning and Suppression of Solids - II')).toBeInTheDocument()
    })
  })
})
