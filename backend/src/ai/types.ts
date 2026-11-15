export type AiProviderName = 'ollama' | 'gemini'

export const SUPPORTED_AI_PROVIDERS: readonly AiProviderName[] = [
  'gemini',
  'ollama',
] as const

export function parseAiProvider(raw: string | undefined): AiProviderName {
  if (!raw || raw.trim() === '') {
    return 'gemini'
  }
  const normalized = raw.trim().toLowerCase()
  if (normalized === 'ollama' || normalized === 'gemini') {
    return normalized
  }
  throw new Error(
    `Unsupported AI provider: "${raw}". Supported providers are: ${SUPPORTED_AI_PROVIDERS.join(', ')}`,
  )
}

export interface AiStatusResult {
  success: boolean
  provider: AiProviderName
  configured: boolean
  available: boolean
  model: string
  message?: string
}

export interface InvestigationCitation {
  investigation_id: string
  title: string
  url: string | null
  relevance_category: string
  research_area: string
}

export interface RetrievedInvestigation {
  investigation_id: string
  title: string
  url: string | null
  research_area: string
  project_type: string | null
  objectives: string | null
  approach: string | null
  relevance_category: string
  relevance_score: number
  relevance_reason: string | null
  is_combustion_related: boolean
  publication_count: number
  document_count: number
}

export interface AiGenerateOptions {
  systemPrompt: string
  userPrompt: string
}

export interface AiGenerateResult {
  answer: string
  provider: AiProviderName
  model: string
}

export interface AiQueryResponse {
  success: boolean
  answer: string
  provider: AiProviderName
  model: string
  investigations: InvestigationCitation[]
}

export interface AiProvider {
  readonly name: AiProviderName
  readonly model: string
  getStatus(): Promise<AiStatusResult>
  generateAnswer(options: AiGenerateOptions): Promise<AiGenerateResult>
}

export interface OllamaConfig {
  baseUrl: string
  model: string
}

export interface GeminiConfig {
  apiKey: string
  model: string
}

export interface AiConfig {
  provider: AiProviderName
  ollama: OllamaConfig
  gemini: GeminiConfig
}
