import type {
  AiGenerateOptions,
  AiGenerateResult,
  AiProvider,
  AiStatusResult,
  GeminiConfig,
  OllamaConfig,
} from '../types.js'
import { GeminiProvider, type GeminiProviderOptions } from './gemini.js'
import { OllamaProvider, type OllamaProviderOptions } from './ollama.js'

export interface FallbackProviderOptions {
  geminiOptions?: GeminiProviderOptions
  ollamaOptions?: OllamaProviderOptions
  onFallback?: (reason: string) => void
}

export class FallbackAiProvider extends GeminiProvider implements AiProvider {
  readonly fallback: OllamaProvider
  private readonly onFallback?: (reason: string) => void

  constructor(
    geminiConfig: Partial<GeminiConfig> = {},
    ollamaConfig: Partial<OllamaConfig> = {},
    options: FallbackProviderOptions = {},
  ) {
    super(geminiConfig, options.geminiOptions)
    this.fallback = new OllamaProvider(ollamaConfig, options.ollamaOptions)
    this.onFallback = options.onFallback
  }

  override async getStatus(): Promise<AiStatusResult> {
    const geminiStatus = await super.getStatus()

    // If Gemini is configured and available, report Gemini
    if (geminiStatus.configured && geminiStatus.available) {
      return geminiStatus
    }

    // Otherwise, check Ollama fallback
    const ollamaStatus = await this.fallback.getStatus()
    if (ollamaStatus.configured && ollamaStatus.available) {
      return {
        ...ollamaStatus,
        message: geminiStatus.configured
          ? 'Gemini is currently unreachable; active on Ollama fallback.'
          : 'Gemini API key not configured; active on Ollama fallback.',
      }
    }

    // Both are unconfigured or unavailable
    return {
      success: true,
      provider: this.name,
      configured: geminiStatus.configured,
      available: false,
      model: this.model,
      message: geminiStatus.configured
        ? 'Gemini service and Ollama fallback are both currently unreachable.'
        : 'Gemini API key is not configured and local Ollama service is unreachable.',
    }
  }

  override async generateAnswer(options: AiGenerateOptions): Promise<AiGenerateResult> {
    // If Gemini is configured, attempt Gemini first
    if (this.isConfigured()) {
      try {
        return await super.generateAnswer(options)
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const reason = `Gemini generation failed (${errorMsg}). Falling back to Ollama.`
        console.warn(`[AI Provider] ${reason}`)
        this.onFallback?.(reason)
      }
    } else {
      const reason = 'Gemini API key not configured. Using Ollama fallback.'
      this.onFallback?.(reason)
    }

    // Fall back to Ollama
    return await this.fallback.generateAnswer(options)
  }
}
