import { config } from '../config.js'
import { FallbackAiProvider } from './providers/fallback.js'
import { GeminiProvider, type GeminiProviderOptions } from './providers/gemini.js'
import { OllamaProvider, type OllamaProviderOptions } from './providers/ollama.js'
import {
  type AiConfig,
  type AiProvider,
  type AiProviderName,
  parseAiProvider,
} from './types.js'

export interface CreateAiProviderOptions {
  provider?: string
  configOverride?: Partial<AiConfig>
  disableFallback?: boolean
  geminiOptions?: GeminiProviderOptions
  ollamaOptions?: OllamaProviderOptions
}

export function createAiProvider(
  options: CreateAiProviderOptions = {},
): AiProvider {
  const providerName: AiProviderName = options.provider
    ? parseAiProvider(options.provider)
    : config.ai.provider

  const aiConfig: AiConfig = {
    provider: providerName,
    ollama: {
      ...config.ai.ollama,
      ...options.configOverride?.ollama,
    },
    gemini: {
      ...config.ai.gemini,
      ...options.configOverride?.gemini,
    },
  }

  switch (providerName) {
    case 'ollama':
      return new OllamaProvider(aiConfig.ollama, options.ollamaOptions)
    case 'gemini':
      if (options.disableFallback) {
        return new GeminiProvider(aiConfig.gemini, options.geminiOptions)
      }
      return new FallbackAiProvider(aiConfig.gemini, aiConfig.ollama, {
        geminiOptions: options.geminiOptions,
        ollamaOptions: options.ollamaOptions,
      })
    default: {
      const exhaustiveCheck: never = providerName
      throw new Error(`Unsupported provider: ${exhaustiveCheck}`)
    }
  }
}

let cachedProvider: AiProvider | null = null

export function getAiProvider(): AiProvider {
  if (!cachedProvider) {
    cachedProvider = createAiProvider()
  }
  return cachedProvider
}

export function resetAiProvider(): void {
  cachedProvider = null
}
