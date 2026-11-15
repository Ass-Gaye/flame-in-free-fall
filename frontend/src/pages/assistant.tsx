import { useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Bot,
  ExternalLink,
  Flame,
  Info,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'

import { RelevanceBadge } from '@/components/relevance-badge'
import { PageHeader } from '@/components/layout/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { getAiStatus, queryAiAssistant } from '@/lib/api'
import { useApiQuery } from '@/lib/api-hooks'
import type { AiCitation } from '@/types/api'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: AiCitation[]
  provider?: string
  model?: string
  isError?: boolean
}

const suggestions = [
  'Which investigations address flame spread in microgravity?',
  'What experiments investigate droplet combustion and extinction?',
  'Tell me about PSI-10 (BASS-II) and its objectives.',
  'What evidence supports direct fire-safety relevance in the dataset?',
]

const groundingSteps = [
  'Extract keywords and identify target investigations.',
  'Retrieve matching records from the validated 133 PSI investigations.',
  'Rank candidates and isolate the top evidence context.',
  'Generate synthesis strictly from retrieved records.',
  'Cite PSI IDs [PSI-XX] and NASA investigation sources.',
  'Explicitly refuse claims when evidence is insufficient.',
]

export function AssistantPage() {
  const { data: status, error: statusError, isLoading: isStatusLoading, retry: refreshStatus } =
    useApiQuery('ai:status', (signal) => getAiStatus({ signal }))

  const [inputQuery, setInputQuery] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am the Flame in Freefall research assistant. Ask me questions about the 133 NASA Physical Sciences Informatics (PSI) combustion and fire-safety investigations. All answers are strictly grounded in retrieved NASA investigation records with traceable citations.',
    },
  ])

  const handleSend = async (queryToSend?: string) => {
    const query = (queryToSend ?? inputQuery).trim()
    if (!query || isGenerating) {
      return
    }

    const userMessageId = `user-${Date.now()}`
    const assistantMessageId = `assistant-${Date.now()}`

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: 'user', content: query },
    ])
    setInputQuery('')
    setIsGenerating(true)

    try {
      const response = await queryAiAssistant(query)
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: response.answer,
          citations: response.investigations,
          provider: response.provider,
          model: response.model,
        },
      ])
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred while generating an answer.'

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: errorMessage,
          isError: true,
        },
      ])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  // Render provider status badge
  let statusBadge = (
    <Badge variant="outline" className="gap-1.5 font-mono text-[11px]">
      <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      Checking provider...
    </Badge>
  )

  if (!isStatusLoading) {
    if (status?.available) {
      statusBadge = (
        <Badge variant="success" className="gap-1.5 font-mono text-[11px]">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          {status.provider} ({status.model})
        </Badge>
      )
    } else if (status?.configured) {
      statusBadge = (
        <Badge variant="warning" className="gap-1.5 font-mono text-[11px]">
          <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          {status.provider} (offline)
        </Badge>
      )
    } else {
      statusBadge = (
        <Badge variant="destructive" className="gap-1.5 font-mono text-[11px]">
          <AlertCircle className="size-3" aria-hidden="true" />
          Provider unconfigured
        </Badge>
      )
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI research intelligence"
        title="AI Research Assistant"
        description="Ask questions about the collected NASA investigations. Answers are synthesized exclusively from retrieved PSI records with transparent citations."
        actions={
          <div className="flex items-center gap-2">
            {statusBadge}
            <Button
              variant="outline"
              size="icon-sm"
              title="Refresh provider status"
              onClick={refreshStatus}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        }
      />

      {status && !status.available && (
        <Alert variant="warning">
          <Info aria-hidden="true" />
          <AlertTitle>
            {status.provider === 'ollama'
              ? 'Local Ollama Service Unavailable'
              : 'AI Provider Unavailable'}
          </AlertTitle>
          <AlertDescription>
            {status.provider === 'ollama' ? (
              <>
                The backend is configured to use local Ollama, but no response was received from{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[0.8em]">localhost:11434</code>.
                Start the Ollama daemon with model{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[0.8em]">{status.model}</code>{' '}
                or set <code className="rounded bg-muted px-1.5 py-0.5 text-[0.8em]">AI_PROVIDER=gemini</code>{' '}
                in your environment.
              </>
            ) : (
              status.message || 'The selected AI provider could not be reached.'
            )}
          </AlertDescription>
        </Alert>
      )}

      {statusError && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Status check failed</AlertTitle>
          <AlertDescription>
            Could not communicate with the backend status endpoint. Ensure the backend server is running.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        {/* Chat Conversation Card */}
        <Card className="flex flex-col gap-0 overflow-hidden py-0">
          <CardHeader className="border-b border-border/70 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                Grounded Research Assistant
              </CardTitle>
              <span className="text-[11px] text-muted-foreground font-mono">
                133 PSI Investigations
              </span>
            </div>
            <CardDescription>
              Inquiries retrieve matching dataset records before answering.
            </CardDescription>
          </CardHeader>

          {/* Messages Stream */}
          <CardContent className="flex-1 space-y-4 p-5 max-h-[540px] overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={msg.role === 'user' ? 'flex justify-end gap-3' : 'flex gap-3'}
              >
                {msg.role === 'assistant' && (
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10">
                    <Bot className="size-4 text-primary" aria-hidden="true" />
                  </div>
                )}

                <div
                  className={
                    msg.role === 'user'
                      ? 'max-w-[80%] rounded-lg rounded-tr-sm border border-primary/25 bg-primary/12 px-4 py-3 text-sm text-foreground'
                      : msg.isError
                        ? 'max-w-[85%] rounded-lg rounded-tl-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'
                        : 'max-w-[85%] rounded-lg rounded-tl-sm border border-border/80 bg-secondary/50 px-4 py-3 text-sm text-foreground space-y-3'
                  }
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                  {/* Render citations if present */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Flame className="size-3 text-primary" aria-hidden="true" />
                        Retrieved Investigation Citations ({msg.citations.length})
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {msg.citations.map((cite) => (
                          <Link
                            key={cite.investigation_id}
                            to={`/investigations/${encodeURIComponent(cite.investigation_id)}`}
                            className="group block rounded-md border border-border/70 bg-secondary/40 p-2.5 transition hover:border-primary/50 hover:bg-secondary/70"
                          >
                            <div className="flex items-center justify-between gap-1.5 pb-1">
                              <span className="font-mono text-xs font-semibold text-primary group-hover:underline">
                                {cite.investigation_id}
                              </span>
                              <RelevanceBadge category={cite.relevance_category} className="scale-90" />
                            </div>
                            <p className="line-clamp-2 text-xs text-foreground/90 font-medium">
                              {cite.title}
                            </p>
                            <span className="mt-1 block text-[10px] text-muted-foreground">
                              {cite.research_area}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.provider && msg.model && (
                    <div className="text-[10px] font-mono text-muted-foreground/75 pt-1">
                      Generated by {msg.provider} ({msg.model})
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40">
                    <User className="size-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                )}
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-3 items-center text-sm text-muted-foreground pt-2">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40">
                  <Bot className="size-4 text-primary animate-pulse" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2">
                  <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />
                  <span>Retrieving NASA PSI evidence and synthesizing answer...</span>
                </div>
              </div>
            )}
          </CardContent>

          {/* Prompt Suggestions */}
          <div className="border-t border-border/70 bg-muted/10 px-5 py-3 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Example Research Queries
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  disabled={isGenerating}
                  onClick={() => {
                    setInputQuery(suggestion)
                    void handleSend(suggestion)
                  }}
                  className="rounded border border-border/70 bg-background/80 px-2.5 py-1 text-left text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-border/70 p-4">
            <div className="rounded-lg border border-input bg-transparent p-2 focus-within:border-primary">
              <Textarea
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about combustion, fire safety, microgravity flame spread, or specific investigations..."
                aria-label="Research question"
                disabled={isGenerating}
                className="min-h-16 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 text-sm"
              />
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
                <span className="text-[11px] text-muted-foreground">
                  Press Enter to submit · Shift+Enter for new line
                </span>
                <Button
                  size="sm"
                  disabled={isGenerating || inputQuery.trim().length === 0}
                  onClick={() => void handleSend()}
                >
                  {isGenerating ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="size-3.5" aria-hidden="true" />
                  )}
                  <span>Send</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Sidebar Info & Grounding Contract */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                Grounding Contract
              </CardTitle>
              <CardDescription>
                The assistant never treats the LLM as the source of truth.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {groundingSteps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-border/70 bg-muted/40 font-mono text-[9px]">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Active AI Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 font-mono text-[11px] text-muted-foreground">
              <div className="flex justify-between gap-3">
                <span>AI_PROVIDER</span>
                <span className="font-semibold text-foreground">
                  {status?.provider ?? 'ollama'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between gap-3">
                <span>ACTIVE_MODEL</span>
                <span className="text-right text-foreground">
                  {status?.model ?? 'gemma4:e2b'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between gap-3">
                <span>STATUS</span>
                <span className={status?.available ? 'text-emerald-500 font-semibold' : 'text-amber-500'}>
                  {status?.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <p className="pt-2 font-sans text-xs leading-relaxed text-muted-foreground">
                To toggle between local Ollama and optional cloud Gemini, adjust{' '}
                <code className="text-foreground font-mono">AI_PROVIDER</code> in{' '}
                <code className="text-foreground font-mono">backend/.env</code>.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-muted/20">
            <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ExternalLink className="size-3.5 text-primary" aria-hidden="true" />
                Scientific Citation Traceability
              </div>
              <p className="leading-relaxed">
                Every generated answer includes direct references to the physical investigation identifiers
                (e.g., PSI-10, PSI-22) and links to the full experimental metadata and publications.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
