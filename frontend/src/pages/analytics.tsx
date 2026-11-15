import {
  BarChart3,
  FileBarChart,
  Info,
  Layers,
  PieChart,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const charts = [
  {
    title: 'Relevance distribution',
    description: 'Direct, supporting, and peripheral counts with the rule evidence behind them.',
    icon: PieChart,
  },
  {
    title: 'Research area distribution',
    description: 'Investigation counts by NASA research area, ordered by share.',
    icon: BarChart3,
  },
  {
    title: 'Project type and extraction',
    description: 'Ground versus microgravity, plus successful and incomplete extraction.',
    icon: Layers,
  },
  {
    title: 'Publication coverage',
    description: 'How many records carry publications, DOIs, and document links.',
    icon: FileBarChart,
  },
]

const planned = [
  'Relevance distribution and evidence coverage',
  'Research area and project type distributions',
  'Extraction completeness and publication availability',
  'Document availability by research area',
  'Recurring research themes derived from curated fields',
  'Potential research gaps, always framed as observations',
]

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Research analytics"
        title="Analytics"
        description="Distribution views and evidence-based observations about the collection. Charts stay empty until the statistics endpoint supplies verified values."
        actions={<Badge variant="warning">Awaiting statistics API</Badge>}
      />

      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Charts are deliberately unpopulated</AlertTitle>
        <AlertDescription>
          The Phase 2 backend will compute these figures from the validated
          dataset. Until then, no counts, percentages, or trend lines are drawn
          here.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        {charts.map((chart) => {
          const Icon = chart.icon
          return (
            <Card key={chart.title}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle>{chart.title}</CardTitle>
                    <CardDescription>{chart.description}</CardDescription>
                  </div>
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  aria-hidden="true"
                  className="relative flex h-44 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border/80 bg-muted/20"
                >
                  <div className="absolute inset-x-4 bottom-4 flex h-24 items-end gap-2 opacity-40">
                    {[38, 62, 44, 78, 54, 88, 66, 50].map((height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t bg-gradient-to-t from-primary/10 to-primary/30"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <span className="relative z-10 rounded-full border border-border/80 bg-background/85 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
                    No data connected
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" aria-hidden="true" />
              Planned analyses
            </CardTitle>
            <CardDescription>
              Built only from fields present in the validated dataset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {planned.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70"
                  />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Interpretation rules
            </CardTitle>
            <CardDescription>
              Every analytical conclusion must stay auditable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-mono text-xs text-primary">01</span>
                State what the dataset shows, with the exact count or relation.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs text-primary">02</span>
                Name the investigations that support the observation.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs text-primary">03</span>
                Explain the limitations, including missing fields and subset
                coverage.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs text-primary">04</span>
                Describe further investigation as a possibility, not a finding.
              </li>
            </ol>
            <p className="mt-4 border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">
              Research gaps are observations about this collected subset, not
              confirmed scientific discoveries.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
