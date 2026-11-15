import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createAiProvider, getAiProvider, resetAiProvider } from '../src/ai/factory.js'
import { FallbackAiProvider } from '../src/ai/providers/fallback.js'
import { GeminiProvider } from '../src/ai/providers/gemini.js'
import { OllamaProvider } from '../src/ai/providers/ollama.js'
import { parseAiProvider } from '../src/ai/types.js'
import { createApp } from '../src/app.js'

describe('AI Provider Configuration & Selection', () => {
  it('selects gemini by default when no provider is explicitly configured', () => {
    expect(parseAiProvider(undefined)).toBe('gemini')
    expect(parseAiProvider('')).toBe('gemini')
    expect(parseAiProvider('   ')).toBe('gemini')
  })

  it('selects ollama when explicitly specified (case-insensitive)', () => {
    expect(parseAiProvider('ollama')).toBe('ollama')
    expect(parseAiProvider('Ollama')).toBe('ollama')
    expect(parseAiProvider('OLLAMA')).toBe('ollama')
  })

  it('selects gemini when explicitly specified (case-insensitive)', () => {
    expect(parseAiProvider('gemini')).toBe('gemini')
    expect(parseAiProvider('Gemini')).toBe('gemini')
    expect(parseAiProvider('GEMINI')).toBe('gemini')
  })

  it('rejects unsupported provider values with a clear error', () => {
    expect(() => parseAiProvider('openai')).toThrowError(
      /Unsupported AI provider: "openai"/,
    )
    expect(() => parseAiProvider('anthropic')).toThrowError(
      /Supported providers are: gemini, ollama/,
    )
  })
})

describe('AI Provider Factory', () => {
  it('returns GeminiProvider (with Ollama fallback) by default', () => {
    resetAiProvider()
    const defaultProvider = getAiProvider()
    expect(defaultProvider.name).toBe('gemini')
    expect(defaultProvider).toBeInstanceOf(GeminiProvider)
    expect(defaultProvider).toBeInstanceOf(FallbackAiProvider)
  })

  it('returns OllamaProvider when ollama is explicitly requested', () => {
    const explicitOllama = createAiProvider({ provider: 'ollama' })
    expect(explicitOllama.name).toBe('ollama')
    expect(explicitOllama).toBeInstanceOf(OllamaProvider)
  })

  it('returns GeminiProvider when gemini is requested', () => {
    const gemini = createAiProvider({
      provider: 'gemini',
      configOverride: {
        gemini: {
          apiKey: 'mock-key',
          model: 'gemini-custom',
        },
      },
    })
    expect(gemini.name).toBe('gemini')
    expect(gemini).toBeInstanceOf(GeminiProvider)
    expect(gemini.model).toBe('gemini-custom')
  })

  it('rejects unsupported provider names from the factory', () => {
    expect(() => createAiProvider({ provider: 'unsupported-provider' })).toThrowError(
      /Unsupported AI provider/,
    )
  })
})

describe('Fallback AI Provider (Gemini Primary with Ollama Fallback)', () => {
  it('reports Gemini status when Gemini credentials are configured', async () => {
    const provider = new FallbackAiProvider(
      { apiKey: 'mock-gemini-key', model: 'gemini-2.5-flash' },
      { baseUrl: 'http://localhost:11434', model: 'gemma4:e2b' },
    )

    const status = await provider.getStatus()
    expect(status.provider).toBe('gemini')
    expect(status.configured).toBe(true)
    expect(status.available).toBe(true)
  })

  it('automatically falls back to Ollama status when Gemini API key is missing', async () => {
    const mockOllamaFetch = async () =>
      new Response(JSON.stringify({ version: '0.1.32' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const provider = new FallbackAiProvider(
      { apiKey: '', model: 'gemini-2.5-flash' },
      { baseUrl: 'http://localhost:11434', model: 'gemma4:e2b' },
      { ollamaOptions: { fetchFn: mockOllamaFetch as unknown as typeof fetch } },
    )

    const status = await provider.getStatus()
    expect(status.provider).toBe('ollama')
    expect(status.configured).toBe(true)
    expect(status.available).toBe(true)
    expect(status.message).toContain('active on Ollama fallback')
  })

  it('falls back to Ollama generation when Gemini API key is missing', async () => {
    const mockOllamaFetch = async () =>
      new Response(JSON.stringify({ response: 'Answer from Ollama fallback' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const provider = new FallbackAiProvider(
      { apiKey: '', model: 'gemini-2.5-flash' },
      { baseUrl: 'http://localhost:11434', model: 'gemma4:e2b' },
      { ollamaOptions: { fetchFn: mockOllamaFetch as unknown as typeof fetch } },
    )

    const result = await provider.generateAnswer({
      systemPrompt: 'System',
      userPrompt: 'User',
    })

    expect(result.provider).toBe('ollama')
    expect(result.answer).toBe('Answer from Ollama fallback')
  })

  it('falls back to Ollama generation when Gemini throws a runtime error', async () => {
    const mockOllamaFetch = async () =>
      new Response(JSON.stringify({ response: 'Recovered answer via Ollama' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    // Mock client that fails during generateContent
    const failingClient = {
      models: {
        generateContent: async () => {
          throw new Error('429 Rate limit exceeded on Gemini')
        },
      },
    }

    const provider = new FallbackAiProvider(
      { apiKey: 'mock-key', model: 'gemini-2.5-flash' },
      { baseUrl: 'http://localhost:11434', model: 'gemma4:e2b' },
      {
        geminiOptions: { client: failingClient as unknown as import('@google/genai').GoogleGenAI },
        ollamaOptions: { fetchFn: mockOllamaFetch as unknown as typeof fetch },
      },
    )

    const result = await provider.generateAnswer({
      systemPrompt: 'System',
      userPrompt: 'User',
    })

    expect(result.provider).toBe('ollama')
    expect(result.answer).toBe('Recovered answer via Ollama')
  })
})

describe('Ollama Provider Adapter', () => {
  it('reports configured and available when service is reachable', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ version: '0.1.32' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const provider = new OllamaProvider(
      { baseUrl: 'http://localhost:11434', model: 'gemma4:e2b' },
      { fetchFn: mockFetch as unknown as typeof fetch },
    )

    const status = await provider.getStatus()
    expect(status).toEqual({
      success: true,
      provider: 'ollama',
      configured: true,
      available: true,
      model: 'gemma4:e2b',
    })
  })

  it('reports available: false gracefully when Ollama service is unreachable', async () => {
    const failingFetch = async () => {
      throw new Error('fetch failed: ECONNREFUSED 127.0.0.1:11434')
    }

    const provider = new OllamaProvider(
      { baseUrl: 'http://localhost:11434', model: 'gemma4:e2b' },
      { fetchFn: failingFetch as unknown as typeof fetch },
    )

    const status = await provider.getStatus()
    expect(status).toEqual({
      success: true,
      provider: 'ollama',
      configured: true,
      available: false,
      model: 'gemma4:e2b',
      message: 'Ollama service is unreachable.',
    })
  })

  it('reports available: false when Ollama responds with non-200 status', async () => {
    const serverErrorFetch = async () =>
      new Response('Internal Error', { status: 503 })

    const provider = new OllamaProvider(
      { baseUrl: 'http://localhost:11434', model: 'gemma4:e2b' },
      { fetchFn: serverErrorFetch as unknown as typeof fetch },
    )

    const status = await provider.getStatus()
    expect(status.configured).toBe(true)
    expect(status.available).toBe(false)
    expect(status.message).toContain('503')
  })

  it('handles missing or invalid Ollama configuration correctly', async () => {
    const unconfigured = new OllamaProvider({ baseUrl: '', model: '' })
    const status1 = await unconfigured.getStatus()
    expect(status1.configured).toBe(false)
    expect(status1.available).toBe(false)

    const invalidUrl = new OllamaProvider({ baseUrl: 'not-a-url', model: 'gemma4:e2b' })
    const status2 = await invalidUrl.getStatus()
    expect(status2.configured).toBe(false)
    expect(status2.available).toBe(false)
  })
})

describe('Gemini Provider Adapter', () => {
  it('handles missing Gemini credentials correctly', async () => {
    const unconfigured = new GeminiProvider({ apiKey: '', model: 'gemini-2.5-flash' })
    expect(unconfigured.isConfigured()).toBe(false)
    expect(unconfigured.getClient()).toBeNull()

    const status = await unconfigured.getStatus()
    expect(status).toEqual({
      success: true,
      provider: 'gemini',
      configured: false,
      available: false,
      model: 'gemini-2.5-flash',
      message: 'Gemini API key is not configured.',
    })
  })

  it('handles configured Gemini credentials without making paid API calls', async () => {
    const secretKey = 'AIzaSyFakeSecretGeminiKeyForTestingOnly12345'
    const configured = new GeminiProvider({
      apiKey: secretKey,
      model: 'gemini-2.5-flash',
    })

    expect(configured.isConfigured()).toBe(true)
    expect(configured.getClient()).not.toBeNull()

    const status = await configured.getStatus()
    expect(status).toEqual({
      success: true,
      provider: 'gemini',
      configured: true,
      available: true,
      model: 'gemini-2.5-flash',
    })

    // Strict verification: secret key is never leaked in status
    const serialized = JSON.stringify(status)
    expect(serialized).not.toContain(secretKey)
  })
})

describe('GET /api/ai/status Endpoint', () => {
  it('is advertised in GET /api endpoints list', async () => {
    const app = createApp()
    const response = await request(app).get('/api').expect(200)

    expect(response.body.endpoints).toContain('GET /api/ai/status')
  })

  it('returns Ollama status when Ollama provider is active', async () => {
    const mockOllama = new OllamaProvider(
      { baseUrl: 'http://localhost:11434', model: 'gemma4:e2b' },
      {
        fetchFn: (async () =>
          new Response(JSON.stringify({ version: '0.1.32' }), {
            status: 200,
          })) as unknown as typeof fetch,
      },
    )

    const app = createApp({ aiProvider: mockOllama })
    const response = await request(app).get('/api/ai/status').expect(200)

    expect(response.body).toEqual({
      success: true,
      provider: 'ollama',
      configured: true,
      available: true,
      model: 'gemma4:e2b',
    })
  })

  it('returns graceful status when Ollama is unavailable', async () => {
    const mockUnavailableOllama = new OllamaProvider(
      { baseUrl: 'http://localhost:11434', model: 'gemma4:e2b' },
      {
        fetchFn: (async () => {
          throw new Error('Connection refused')
        }) as unknown as typeof fetch,
      },
    )

    const app = createApp({ aiProvider: mockUnavailableOllama })
    const response = await request(app).get('/api/ai/status').expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.provider).toBe('ollama')
    expect(response.body.configured).toBe(true)
    expect(response.body.available).toBe(false)
  })

  it('returns Gemini status when Gemini provider is active and configured', async () => {
    const secretKey = 'super-confidential-gemini-token-99999'
    const mockGemini = new GeminiProvider({
      apiKey: secretKey,
      model: 'gemini-2.5-flash',
    })

    const app = createApp({ aiProvider: mockGemini })
    const response = await request(app).get('/api/ai/status').expect(200)

    expect(response.body).toEqual({
      success: true,
      provider: 'gemini',
      configured: true,
      available: true,
      model: 'gemini-2.5-flash',
    })

    // Strict leak check: API key is never in body or headers
    const rawBody = JSON.stringify(response.body)
    expect(rawBody).not.toContain(secretKey)
    expect(JSON.stringify(response.headers)).not.toContain(secretKey)
  })

  it('returns Gemini status when credentials are missing', async () => {
    const mockUnconfiguredGemini = new GeminiProvider({
      apiKey: '',
      model: 'gemini-2.5-flash',
    })

    const app = createApp({ aiProvider: mockUnconfiguredGemini })
    const response = await request(app).get('/api/ai/status').expect(200)

    expect(response.body).toEqual({
      success: true,
      provider: 'gemini',
      configured: false,
      available: false,
      model: 'gemini-2.5-flash',
      message: 'Gemini API key is not configured.',
    })
  })
})
