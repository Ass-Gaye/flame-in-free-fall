import { Bot, Info, Send, ShieldCheck, Sparkles, User } from 'lucide-react'

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

const suggestions = [
  'Which investigations address flame spread?',
  'What evidence supports a direct fire-safety label?',
  'Which records have no associated publications?',
  'Compare two investigations by objective and approach.',
]

const groundingSteps = [
  'Identify the information the question needs.',
  'Retrieve matching investigations from the validated dataset.',
  'Rank and select the smallest useful context.',
  'Answer only from retrieved records.',
  'Cite PSI IDs and NASA source URLs.',
  'State clearly when the dataset is insufficient.',
]

export function AssistantPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI research assistant"
        title="Grounded research questions"
        description="The assistant will retrieve NASA investigations before answering and will cite the records it used. It is not connected in this phase."
        actions={<Badge variant="warning">Model not connected</Badge>}
      />

      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Interface preview only</AlertTitle>
        <AlertDescription>
          Retrieval and the local <code className="rounded bg-muted px-1.5 py-0.5 text-[0.8em]">gemma4:e2b</code>{" "}
          model arrive in Phase 5. The composer is intentionally disabled so the
          interface cannot imply an answer that was never generated.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b border-border/70 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                Research assistant
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[10px]">
                preview
              </Badge>
            </div>
            <CardDescription>
              Answers will be grounded in retrieved investigation records.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-5">
            <div className="flex gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40">
                <Bot className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="max-w-[85%] rounded-lg rounded-tl-sm border border-border/70 bg-muted/30 px-3.5 py-2.5 text-sm leading-relaxed text-muted-foreground">
                The assistant is not available yet. When connected, it will answer
                only from the cleaned dataset and will show the PSI investigations
                used for each response.
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <div className="max-w-[75%] rounded-lg rounded-tr-sm border border-border/60 bg-secondary/60 px-3.5 py-2.5 text-sm text-muted-foreground">
                Example: which records are directly relevant to fire safety?
              </div>
              <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40">
                <User className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Example prompts
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    disabled
                    className="h-auto whitespace-normal py-1.5 text-left text-xs font-normal"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>

          <div className="border-t border-border/70 p-4">
            <div className="rounded-lg border border-input bg-transparent p-2">
              <Textarea
                placeholder="Ask about the collected NASA investigations…"
                aria-label="Research question"
                disabled
                className="min-h-16 border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[10px] text-muted-foreground">
                  Local model · no data leaves this machine
                </span>
                <Button size="sm" disabled>
                  <Send aria-hidden="true" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                Grounding contract
              </CardTitle>
              <CardDescription>
                The model is never treated as the source of truth.
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
              <CardTitle>Planned configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 font-mono text-[11px] text-muted-foreground">
              <p className="flex justify-between gap-3">
                <span>AI_PROVIDER</span>
                <span>ollama</span>
              </p>
              <Separator />
              <p className="flex justify-between gap-3">
                <span>OLLAMA_MODEL</span>
                <span>gemma4:e2b</span>
              </p>
              <Separator />
              <p className="flex justify-between gap-3">
                <span>OLLAMA_BASE_URL</span>
                <span className="text-right">localhost:11434</span>
              </p>
              <p className="pt-2 font-sans text-xs leading-relaxed text-muted-foreground">
                Configuration stays in environment variables. No API keys or
                secrets belong in source files.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
