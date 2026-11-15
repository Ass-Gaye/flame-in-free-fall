import { GoogleGenAI } from '@google/genai'

import type {
  AiGenerateOptions,
  AiGenerateResult,
  AiProvider,
  AiStatusResult,
  GeminiConfig,
} from '../types.js'

export interface GeminiProviderOptions {
  client?: GoogleGenAI
}

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini' as const
  readonly model: string
  private readonly apiKey: string
  private client: GoogleGenAI | null = null
  private clientInitError: string | null = null

  constructor(
    config: Partial<GeminiConfig> = {},
    options: GeminiProviderOptions = {},
  ) {
    this.apiKey = (config.apiKey ?? '').trim()
    this.model = (config.model ?? 'gemini-2.5-flash').trim()

    if (options.client) {
      this.client = options.client
    } else if (this.isConfigured()) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey })
      } catch (error: unknown) {
        this.client = null
        this.clientInitError =
          error instanceof Error
            ? 'Failed to initialize Gemini client.'
            : 'Unknown error initializing Gemini client.'
      }
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0 && this.model.length > 0)
  }

  getClient(): GoogleGenAI | null {
    return this.client
  }

  async getStatus(): Promise<AiStatusResult> {
    if (!this.isConfigured()) {
      return {
        success: true,
        provider: this.name,
        configured: false,
        available: false,
        model: this.model || 'unknown',
        message: 'Gemini API key is not configured.',
      }
    }

    if (this.clientInitError) {
      return {
        success: true,
        provider: this.name,
        configured: false,
        available: false,
        model: this.model,
        message: this.clientInitError,
      }
    }

    // Configured with API key and valid SDK instance without executing paid calls.
    return {
      success: true,
      provider: this.name,
      configured: true,
      available: true,
      model: this.model,
    }
  }

  async generateAnswer(options: AiGenerateOptions): Promise<AiGenerateResult> {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Gemini provider is not configured properly.')
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: options.userPrompt,
        config: {
          systemInstruction: options.systemPrompt,
        },
      })

      return {
        answer: response.text ?? '',
        provider: this.name,
        model: this.model,
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Gemini generation failed: ${error.message}`)
      }
      throw new Error('Gemini generation failed: unknown error.')
    }
  }
}
