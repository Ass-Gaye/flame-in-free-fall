import type {
  AiGenerateOptions,
  AiGenerateResult,
  AiProvider,
  AiStatusResult,
  OllamaConfig,
} from '../types.js'

export interface OllamaProviderOptions {
  fetchFn?: typeof fetch
}

export class OllamaProvider implements AiProvider {
  readonly name = 'ollama' as const
  readonly baseUrl: string
  readonly model: string
  private readonly fetchFn: typeof fetch

  constructor(
    config: Partial<OllamaConfig> = {},
    options: OllamaProviderOptions = {},
  ) {
    this.baseUrl = (config.baseUrl ?? 'http://localhost:11434').trim()
    this.model = (config.model ?? 'gemma4:e2b').trim()
    this.fetchFn = options.fetchFn ?? globalThis.fetch
  }

  isConfigured(): boolean {
    if (!this.baseUrl || !this.model) {
      return false
    }
    try {
      new URL(this.baseUrl)
      return true
    } catch {
      return false
    }
  }

  async getStatus(): Promise<AiStatusResult> {
    if (!this.isConfigured()) {
      return {
        success: true,
        provider: this.name,
        configured: false,
        available: false,
        model: this.model || 'unknown',
        message: 'Ollama base URL or model is not properly configured.',
      }
    }

    try {
      const url = new URL('/api/version', this.baseUrl).toString()
      const response = await this.fetchFn(url, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      })

      if (response.ok) {
        return {
          success: true,
          provider: this.name,
          configured: true,
          available: true,
          model: this.model,
        }
      }

      return {
        success: true,
        provider: this.name,
        configured: true,
        available: false,
        model: this.model,
        message: `Ollama service responded with status ${response.status}.`,
      }
    } catch {
      return {
        success: true,
        provider: this.name,
        configured: true,
        available: false,
        model: this.model,
        message: 'Ollama service is unreachable.',
      }
    }
  }

  async generateAnswer(options: AiGenerateOptions): Promise<AiGenerateResult> {
    if (!this.isConfigured()) {
      throw new Error('Ollama provider is not configured properly.')
    }

    try {
      const url = new URL('/api/generate', this.baseUrl).toString()
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          system: options.systemPrompt,
          prompt: options.userPrompt,
          stream: false,
          think: false,
          options: {
            num_ctx: 4096,
            num_predict: 512,
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(180000),
      })

      if (!response.ok) {
        throw new Error(`Ollama service returned HTTP status ${response.status}`)
      }

      const data = (await response.json()) as { response?: string; thinking?: string }
      const answer = (data.response && data.response.trim().length > 0)
        ? data.response.trim()
        : (data.thinking ?? '').trim()

      return {
        answer,
        provider: this.name,
        model: this.model,
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Ollama generation failed: ${error.message}`)
      }
      throw new Error('Ollama generation failed: unknown error.')
    }
  }
}
