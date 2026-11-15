import { useState } from 'react'
import {
  AppWindow,
  Cpu,
  Database,
  Eye,
  Info,
  Laptop,
  Moon,
  MonitorSmartphone,
  Sun,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/states/empty-state'
import { ErrorState } from '@/components/states/error-state'
import { LoadingState } from '@/components/states/loading-state'
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
import { useTheme, type Theme } from '@/lib/theme'
import { useDatasetStatus } from '@/lib/dataset-status'
import { formatCount, formatTimestamp, shortHash } from '@/lib/format'
import { cn } from '@/lib/utils'

const themeOptions: {
  value: Theme
  label: string
  description: string
  icon: typeof Sun
}[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Bright surfaces for well-lit rooms.',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Low-light palette for long reading sessions.',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow the operating system preference.',
    icon: Laptop,
  },
]

const previewStates = [
  { value: 'empty', label: 'Empty' },
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Error' },
] as const

type PreviewState = (typeof previewStates)[number]['value']

const aiFields = [
  ['Provider', 'ollama'],
  ['Model', 'gemma4:e2b'],
  ['Base URL', 'http://localhost:11434'],
  ['Status', 'Configured in Phase 5'],
]

const stack = [
  ['React', '19'],
  ['TypeScript', '7'],
  ['Vite', '8'],
  ['Tailwind CSS', '4'],
  ['Router', 'React Router'],
]

export function SettingsPage() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const status = useDatasetStatus()
  const [preview, setPreview] = useState<PreviewState>('empty')

  const datasetFields: [string, string][] = [
    ['File', 'nasa-fire-data/psi_output/merged_master_dataset.json'],
    [
      'Records',
      status.state === 'connected'
        ? `${formatCount(status.investigationsLoaded) ?? '—'} loaded`
        : status.state === 'offline'
          ? 'Unavailable while the API is offline'
          : 'Loading…',
    ],
    ['Access', 'Read-only API'],
    [
      'Connection',
      status.state === 'connected'
        ? 'Connected'
        : status.state === 'offline'
          ? 'Offline'
          : 'Connecting…',
    ],
    ['Database', status.databaseProvider ?? 'Unavailable'],
    [
      'Dataset SHA-256',
      shortHash(status.dataset?.dataset_sha256, 18) ?? 'Unavailable',
    ],
    [
      'Ingested',
      formatTimestamp(status.dataset?.ingested_at) ?? 'Unavailable',
    ],
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Appearance and configuration"
        description="Theme preferences apply immediately. The dataset panel reflects the live read-only API; this page does not pretend to save settings that have no endpoint."
        actions={
          <Badge
            variant={
              status.state === 'connected'
                ? 'success'
                : status.state === 'offline'
                  ? 'warning'
                  : 'muted'
            }
          >
            {status.state === 'connected'
              ? 'Phase 3 · API connected'
              : status.state === 'offline'
                ? 'Phase 3 · API offline'
                : 'Checking connection…'}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="size-4 text-primary" aria-hidden="true" />
              Appearance
            </CardTitle>
            <CardDescription>
              Saved in this browser as <code className="text-[0.85em]">fif-theme</code>.
              Currently rendering <strong>{resolvedTheme}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              role="radiogroup"
              aria-label="Theme preference"
              className="grid gap-2 sm:grid-cols-3"
            >
              {themeOptions.map((option) => {
                const Icon = option.icon
                const selected = theme === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-lg border p-3 text-left outline-none transition-colors',
                      'focus-visible:ring-[3px] focus-visible:ring-ring/40',
                      selected
                        ? 'border-primary/50 bg-primary/8'
                        : 'border-border/70 bg-muted/20 hover:border-border hover:bg-muted/40',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-8 place-items-center rounded-md border',
                        selected
                          ? 'border-primary/40 bg-primary/15 text-primary'
                          : 'border-border/70 bg-background text-muted-foreground',
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-[11px] leading-relaxed text-muted-foreground">
                      {option.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="size-4 text-primary" aria-hidden="true" />
              State gallery
            </CardTitle>
            <CardDescription>
              Preview the reusable empty, loading, and error components used across
              the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {previewStates.map((state) => (
                <Button
                  key={state.value}
                  variant={preview === state.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreview(state.value)}
                  aria-pressed={preview === state.value}
                >
                  {state.label}
                </Button>
              ))}
            </div>
            <div className="min-h-52 overflow-hidden rounded-lg border border-border/70 bg-card">
              {preview === 'empty' ? (
                <EmptyState
                  icon={Database}
                  title="Nothing here yet"
                  description="Empty states explain what is missing and why, instead of listing fake records."
                />
              ) : null}
              {preview === 'loading' ? (
                <LoadingState label="Loading investigation preview" rows={3} />
              ) : null}
              {preview === 'error' ? (
                <ErrorState
                  title="Preview error state"
                  description="Errors name the failed action and offer a retry, without exposing stack traces."
                  onRetry={() => setPreview('empty')}
                />
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-4 text-primary" aria-hidden="true" />
              Dataset
            </CardTitle>
            <CardDescription>Live read-only connection.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2.5">
              {datasetFields.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd
                    className="break-words text-xs leading-relaxed"
                    title={label === 'Dataset SHA-256' ? status.dataset?.dataset_sha256 ?? undefined : undefined}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={status.refresh}
            >
              Re-check connection
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="size-4 text-primary" aria-hidden="true" />
              AI assistant
            </CardTitle>
            <CardDescription>Planned local configuration.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2.5">
              {aiFields.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="break-words font-mono text-[11px] leading-relaxed">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AppWindow className="size-4 text-primary" aria-hidden="true" />
              About this build
            </CardTitle>
            <CardDescription>Read-only data connection.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1.5">
              {stack.map(([name, version]) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <dt className="text-muted-foreground">{name}</dt>
                  <dd className="font-mono">{version}</dd>
                </div>
              ))}
            </dl>
            <Separator className="my-3" />
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <MonitorSmartphone className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Responsive from small phones to wide desktops. Statistics are read
              from the validated API and are never estimated in the browser.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Only the theme preference is persisted, and only in this browser.
              Dataset and AI fields stay read-only until the backend exposes
              settings endpoints.
            </p>
          </div>
          <Badge variant="muted" className="w-fit shrink-0">
            Nothing else is saved
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
