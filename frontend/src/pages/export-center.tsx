import { useState } from 'react'
import {
  Archive,
  BarChart3,
  Check,
  Database,
  Download,
  FileCode,
  FileJson,
  FileSpreadsheet,
  Filter,
  Flame,
  Info,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'

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
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { exportDatasetUrl } from '@/lib/api'

const fullExports = [
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

const filteredPresets = [
  {
    title: 'Direct Fire Safety Investigations',
    count: '10 investigations',
    description:
      'Investigations explicitly addressing fire safety, flame spread, extinction, suppression, or smoke detection.',
    params: { relevance: ['direct'] },
    filename: 'flame-in-freefall-direct-fire-safety',
  },
  {
    title: 'Supporting Combustion Studies',
    count: '14 investigations',
    description:
      'Combustion and droplet science investigations with indirect fire-safety relevance (e.g. ACME, FLEX, SPICE).',
    params: { relevance: ['supporting'] },
    filename: 'flame-in-freefall-supporting-combustion',
  },
  {
    title: 'All Combustion Science Records',
    count: '24 investigations',
    description:
      'The complete set of NASA Combustion Science investigations (Direct + Supporting).',
    params: { area: ['Combustion Science'] },
    filename: 'flame-in-freefall-combustion-science',
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
  const [lookupId, setLookupId] = useState('')
  const normalizedId = lookupId.trim().toUpperCase()
  const isValidId = /^PSI-\d+$/.test(normalizedId)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Export center"
        title="Exports"
        description="Download the cleaned collection in JSON or CSV. Exports are produced by the backend directly from the validated source file or structured query engine, not from browser-side copies."
        actions={<Badge variant="success">Phase 6 · Verified Exports</Badge>}
      />

      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Verified Dataset & Research Exports</AlertTitle>
        <AlertDescription>
          Downloads are served directly from the validated collection by the
          read-only API. Both JSON and CSV exports reflect the complete 133
          NASA PSI investigations with verified DOIs, ISA-Tab provenance, and transparent classifications.
        </AlertDescription>
      </Alert>

      {/* 1. Full Dataset Exports */}
      <div>
        <h2 className="mb-3 text-base font-semibold tracking-tight text-foreground">
          Full Dataset Downloads (All 133 Investigations)
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {fullExports.map((item) => {
            const Icon = item.icon
            const formatKey = item.format.toLowerCase() as 'json' | 'csv'
            return (
              <Card key={item.format} className="gap-0 py-0">
                <CardHeader className="px-5 pb-4 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="size-5" aria-hidden="true" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Export All as {item.format}</CardTitle>
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
                  <p className="mt-4 rounded-md border border-border/70 bg-secondary/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {item.endpoint}
                  </p>
                </CardContent>
                <CardFooter className="border-t border-border/70 px-5 py-3">
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <a
                      href={exportDatasetUrl(formatKey)}
                      download={`flame-in-freefall-dataset.${formatKey}`}
                      className="flex items-center justify-center gap-2"
                    >
                      <Download aria-hidden="true" className="size-4" />
                      Download Complete {item.format}
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 2. Filtered Subsets and Quick Presets */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Curated Research Subsets
          </h2>
          <Button variant="ghost" size="sm" asChild className="text-xs text-primary">
            <Link to="/investigations" className="flex items-center gap-1.5">
              <Filter className="size-3.5" aria-hidden="true" />
              Build Custom Query in Explorer
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {filteredPresets.map((preset) => (
            <Card key={preset.title} className="flex flex-col justify-between gap-0 py-0">
              <CardHeader className="px-5 pb-3 pt-5">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {preset.count}
                  </Badge>
                  <Flame className="size-4 text-amber-500" aria-hidden="true" />
                </div>
                <CardTitle className="mt-2 text-sm">{preset.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {preset.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex items-center gap-2 border-t border-border/70 px-5 py-3">
                <Button variant="outline" size="sm" asChild className="flex-1 text-xs">
                  <a
                    href={exportDatasetUrl({ format: 'json', ...preset.params })}
                    download={`${preset.filename}.json`}
                  >
                    <Download className="mr-1 size-3" aria-hidden="true" />
                    JSON
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild className="flex-1 text-xs">
                  <a
                    href={exportDatasetUrl({ format: 'csv', ...preset.params })}
                    download={`${preset.filename}.csv`}
                  >
                    <Download className="mr-1 size-3" aria-hidden="true" />
                    CSV
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. Research Statistics & Single Record Exporter */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardHeader className="px-5 pb-4 pt-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg border border-border/70 bg-muted/40 text-primary">
                <BarChart3 className="size-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-base">Research Statistics Export</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Summary aggregates, research area breakdowns, relevance counts, and metadata.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 text-sm text-muted-foreground">
            <p className="leading-relaxed">
              Downloads the complete analytics payload calculated from the database, including coverage counts and publication totals.
            </p>
            <p className="mt-3 rounded-md border border-border/70 bg-muted/30 px-3 py-2 font-mono text-[11px]">
              GET /api/export?type=statistics
            </p>
          </CardContent>
          <CardFooter className="border-t border-border/70 px-5 py-3">
            <Button variant="outline" size="sm" asChild className="w-full">
              <a
                href={exportDatasetUrl({ type: 'statistics' })}
                download="flame-in-freefall-statistics.json"
                className="flex items-center justify-center gap-2"
              >
                <Download aria-hidden="true" className="size-4" />
                Download Statistics JSON
              </a>
            </Button>
          </CardFooter>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="px-5 pb-4 pt-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg border border-border/70 bg-muted/40 text-primary">
                <FileCode className="size-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-base">Single Record Exporter</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Download an individual PSI investigation record with complete original fields.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Enter PSI ID (e.g. PSI-117, PSI-68)…"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                className="pl-9 font-mono text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isValidId
                ? `Ready to export ${normalizedId}`
                : 'Enter a valid identifier like PSI-25 or PSI-117.'}
            </p>
          </CardContent>
          <CardFooter className="flex items-center gap-2 border-t border-border/70 px-5 py-3">
            <Button
              variant="outline"
              size="sm"
              disabled={!isValidId}
              asChild={isValidId}
              className="flex-1 text-xs"
            >
              {isValidId ? (
                <a
                  href={exportDatasetUrl({ format: 'json', id: normalizedId })}
                  download={`flame-in-freefall-${normalizedId}.json`}
                >
                  <Download className="mr-1 size-3" aria-hidden="true" />
                  Record JSON
                </a>
              ) : (
                <span>Record JSON</span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!isValidId}
              asChild={isValidId}
              className="flex-1 text-xs"
            >
              {isValidId ? (
                <a
                  href={exportDatasetUrl({ format: 'csv', id: normalizedId })}
                  download={`flame-in-freefall-${normalizedId}.csv`}
                >
                  <Download className="mr-1 size-3" aria-hidden="true" />
                  Record CSV
                </a>
              ) : (
                <span>Record CSV</span>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 4. Preservation Rules & Source of Truth */}
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
