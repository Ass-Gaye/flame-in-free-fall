import {
  Archive,
  Check,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  Info,
  ShieldCheck,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const exports = [
  {
    format: 'JSON',
    icon: FileJson,
    description:
      'The full validated record shape, including nested publications, documents, and relevance evidence.',
    details: ['UTF-8, no BOM', 'Nested arrays preserved', 'Key order stable'],
    endpoint: 'GET /api/export?format=json',
  },
  {
    format: 'CSV',
    icon: FileSpreadsheet,
    description:
      'A flat table for spreadsheets and analysis tools, with embedded newlines kept inside quoted fields.',
    details: ['UTF-8 with BOM', 'CRLF row endings', 'Quoted multi-line fields'],
    endpoint: 'GET /api/export?format=csv',
  },
]

const rules = [
  'Values are copied from the cleaned dataset; nothing is recomputed at download time.',
  'Investigation DOIs and publication DOIs remain separate columns or fields.',
  'Empty arrays and missing values stay empty — they are never filled with placeholders.',
  'Truncated sections are exported as stored and flagged by extraction status.',
  'Relevance labels ship with their score and the rule evidence that produced them.',
  'Exports never include secrets, local paths outside the data directory, or model configuration.',
]

export function ExportCenterPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Export center"
        title="Exports"
        description="Download the cleaned collection in JSON or CSV. Exports are produced by the backend directly from the validated source file, not from browser-side copies."
        actions={<Badge variant="warning">Export API not connected</Badge>}
      />

      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Downloads are disabled until Phase 2</AlertTitle>
        <AlertDescription>
          The buttons below describe the finished export flow. They stay disabled
          so the interface cannot hand out a file that was never generated from
          the validated dataset.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        {exports.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.format} className="gap-0 py-0">
              <CardHeader className="px-5 pb-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-lg border border-border/70 bg-muted/40 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Export as {item.format}</CardTitle>
                      <CardDescription className="mt-1">
                        {item.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <ul className="space-y-2">
                  {item.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="size-3.5 text-primary" aria-hidden="true" />
                      {detail}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 rounded-md border border-border/70 bg-muted/30 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  {item.endpoint}
                </p>
              </CardContent>
              <CardFooter className="border-t border-border/70 px-5 py-3">
                <Button variant="outline" size="sm" disabled className="w-full">
                  <Download aria-hidden="true" />
                  Download {item.format}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Preservation rules
            </CardTitle>
            <CardDescription>
              What every export guarantees about the underlying data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {rules.map((rule) => (
                <li key={rule} className="flex gap-3 text-sm text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70"
                  />
                  <span className="leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-4 text-primary" aria-hidden="true" />
                Source of truth
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                nasa-fire-data/psi_output/merged_master_dataset.json
              </p>
              <Separator />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Files are read-only for the application. Regeneration happens only
                through the data pipeline scripts, and the validator runs before
                any export is served.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="size-4 text-primary" aria-hidden="true" />
                Original data stays untouched
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p>
                NASA source pages and ISA-Tab archives are never modified. All
                repairs are additive and reproducible from the original captures.
              </p>
              <p className="text-xs">
                Export formats mirror the stored field meaning, even when a field
                is empty or marked incomplete.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
