import { Link } from 'react-router-dom'
import { HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react'

import { ChartCard } from './chart-card'

interface ResearchGapItem {
  id: string
  title: string
  finding: string
  datasetEvidence: string
  supportingIds: string[]
  limitations: string
  potentialAvenues: string
}

const observedGaps: ResearchGapItem[] = [
  {
    id: 'gap-fuel-morphology',
    title: 'Disparity between Droplet Combustion and Porous/Smoldering Solid Fuels',
    finding:
      'The dataset has comprehensive coverage for spherically symmetric liquid droplets, but low documentation for porous, smoldering, and complex multi-layered spacecraft composite materials.',
    datasetEvidence:
      'Liquid droplet combustion accounts for multiple dedicated campaigns (PSI-68, PSI-69), whereas porous fabric and smoldering flame spread are represented primarily by PSI-62, PSI-98, and PSI-99.',
    supportingIds: ['PSI-68', 'PSI-69', 'PSI-62', 'PSI-98', 'PSI-99'],
    limitations:
      'The dataset reflects specific flight hardware facilities (e.g., Combustion Integrated Rack on ISS, Cygnus Saffire). Ground-based drop tower experiments or sounding rocket flights are not fully represented in this subset.',
    potentialAvenues:
      'Cross-correlating NASA Technical Reports Server (NTRS) records on microgravity smoldering and deep-bed thermal degradation to supplement the PSI investigation set.',
  },
  {
    id: 'gap-document-availability',
    title: 'Document-Link Coverage Disparity in Portal Records',
    finding:
      'A notable disparity exists across the collection between records with attached document links and those without.',
    datasetEvidence:
      'Only 28 of 133 investigations (21.1%) carry attached hardware or facility document links (30 total document entries, representing 19 distinct URLs). 105 investigations (78.9%) have no attached document links.',
    supportingIds: ['PSI-101', 'PSI-102', 'PSI-115', 'PSI-165'],
    limitations:
      'An empty document array reflects link availability on the PSI web portal at scrape time, not an absence of scientific documentation or telemetry at NASA. Attached documents are facility hardware guides, not raw sensor time-series datasets.',
    potentialAvenues:
      'Cross-referencing verified investigation DOIs against NASA STI / NTRS repositories to retrieve external technical reports and flight experiment documentation.',
  },
  {
    id: 'gap-isa-metadata-coverage',
    title: 'Metadata Granularity Differential (ISA-Tab vs. Web Scrape)',
    finding:
      'Investigations enriched from NASA ISA-Tab archives possess much higher fidelity metadata (including study parameters, hardware, proposal titles, and funding contacts) than scraped records.',
    datasetEvidence:
      '22 investigations (16.5%) are enriched with ISA-Tab archives; 111 investigations (83.5%) rely exclusively on detail-page web scraping where research approach or methodology may be truncated.',
    supportingIds: ['PSI-25', 'PSI-26', 'PSI-68', 'PSI-98', 'PSI-100'],
    limitations:
      'ISA-Tab archives are distributed as multi-study ZIP files whose filenames often diverge from their contents, requiring content-based Study Identifier matching.',
    potentialAvenues:
      'Acquiring and deterministic-merging additional ISA-Tab archives for the remaining Combustion Science and Fluid Physics records via the project merge_isa.py pipeline.',
  },
  {
    id: 'gap-incomplete-extractions',
    title: 'Unresolved Incomplete Record Extractions',
    finding:
      'Four investigations were incompletely parsed during the initial data extraction pipeline.',
    datasetEvidence:
      'PSI-34, PSI-165, PSI-168, and PSI-184 are flagged with extraction_status: "incomplete". PSI-165 and PSI-168 additionally lack verified investigation DOIs.',
    supportingIds: ['PSI-34', 'PSI-165', 'PSI-168', 'PSI-184'],
    limitations:
      'These extraction anomalies stem from DOM layout variations on the NASA PSI portal during scraping, not from scientific flaws in the underlying research.',
    potentialAvenues:
      'Executing a targeted scraper run against the 4 specific PSI portal URLs with updated selector fallbacks to achieve 100% complete extraction.',
  },
]

export function ResearchGaps() {
  return (
    <ChartCard
      title="Evidence-Based Research Gap Observations"
      description="Systematic observations derived from dataset distributions, following strict scientific integrity guidelines."
      icon={HelpCircle}
      footerNote="Research gaps represent empirical observations regarding this collected subset, not definitive scientific judgments or evaluations of research quality."
    >
      <div className="space-y-4">
        {observedGaps.map((gap, index) => (
          <div
            key={gap.id}
            className="rounded-lg border border-border/70 bg-card p-4 space-y-3 transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">
                    0{index + 1}
                  </span>
                  <h4 className="text-sm font-semibold tracking-tight text-foreground">
                    {gap.title}
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {gap.finding}
                </p>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
              <div className="rounded-md border border-border/40 bg-muted/20 p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px] uppercase tracking-wider">
                  <CheckCircle2 className="size-3 text-emerald-500" />
                  Dataset Evidence
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {gap.datasetEvidence}
                </p>
              </div>

              <div className="rounded-md border border-border/40 bg-muted/20 p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px] uppercase tracking-wider">
                  <AlertTriangle className="size-3 text-amber-500" />
                  Known Limitations
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {gap.limitations}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Supporting IDs:
                </span>
                <div className="flex flex-wrap gap-1">
                  {gap.supportingIds.map((id) => (
                    <Link
                      key={id}
                      to={`/investigations/${encodeURIComponent(id)}`}
                      className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {id}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground italic">
                Avenue: {gap.potentialAvenues.slice(0, 65)}…
              </div>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}
