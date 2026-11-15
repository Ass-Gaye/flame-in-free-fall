import { Link } from 'react-router-dom'
import { Flame, ShieldAlert, Droplets, Wind, Sparkles, ExternalLink } from 'lucide-react'

import { ChartCard } from './chart-card'

interface ThemeDefinition {
  title: string
  icon: typeof Flame
  description: string
  focus: string
  investigations: { id: string; title: string; role: string }[]
  keyFindings: string[]
}

const combustionThemes: ThemeDefinition[] = [
  {
    title: 'Spacecraft Fire Safety & Material Flammability (SAFFIRE)',
    icon: ShieldAlert,
    description:
      'Large-scale flame growth and material flammability experiments conducted in low-gravity onboard uncrewed Cygnus cargo vehicles.',
    focus: 'Practical fire prevention, containment, and extinguishment limits in spacecraft environments.',
    investigations: [
      { id: 'PSI-98', title: 'Saffire-I', role: 'Large-scale cotton-fiberglass flame spread' },
      { id: 'PSI-99', title: 'Saffire-II', role: 'Material flammability limits & sample geometry' },
      { id: 'PSI-100', title: 'Saffire-III', role: 'High-speed forced flow fire growth' },
    ],
    keyFindings: [
      'Opposed and concurrent flame spread behavior at varying forced flow velocities',
      'Evaluation of NASA flammability standards under realistic microgravity low-flow conditions',
      'Post-burn residue characterization and toxic combustion product formation',
    ],
  },
  {
    title: 'Solid Fuel Burning and Suppression (BASS Series)',
    icon: Flame,
    description:
      'Microgravity combustion of solid fuels under varying ambient air flows, nitrogen dilution, and sample geometries on the ISS.',
    focus: 'Flame extinction limits and effectiveness of gaseous suppression agents.',
    investigations: [
      { id: 'PSI-25', title: 'BASS', role: 'Burning and Suppression of Solids - Baseline' },
      { id: 'PSI-26', title: 'BASS-II', role: 'Thick & thin solid fuel combustion dynamics' },
    ],
    keyFindings: [
      'Direct observation of radiative extinction at low flow velocities without buoyant convection',
      'Evaluation of critical oxygen index for polymeric materials in microgravity',
      'Determination of minimum extinguishment air flows for gaseous suppressant deployment',
    ],
  },
  {
    title: 'Droplet Combustion & Cool Flame Physics (FLEX Series)',
    icon: Droplets,
    description:
      'Investigation of spherically symmetric droplet burning of liquid alkane fuels, bi-component mixtures, and water-in-fuel emulsions.',
    focus: 'Isolated droplet extinction, soot formation, and low-temperature secondary burning regimes.',
    investigations: [
      { id: 'PSI-68', title: 'FLEX', role: 'Flame Extinction Experiment - Liquid Droplets' },
      { id: 'PSI-69', title: 'FLEX-2', role: 'Bi-component fuels and cool flame transitions' },
    ],
    keyFindings: [
      'Discovery and verification of self-sustaining "cool flame" burning regimes after hot flame extinction',
      'Soot shell formation and radiative heat transfer mechanics in spherical geometry',
      'Validation of multi-stage chemical kinetic models in the absence of buoyant convective drift',
    ],
  },
  {
    title: 'Spacecraft Smoke & Aerosol Particle Detection (SAME)',
    icon: Wind,
    description:
      'Characterization of smoke particulates produced from typical spacecraft materials subjected to overheating, pyrolysis, and flaming.',
    focus: 'Early warning fire detection systems with reduced false alarm rates.',
    investigations: [
      { id: 'PSI-101', title: 'SAME', role: 'Smoke Aerosol Measurement Experiment' },
      { id: 'PSI-102', title: 'SAME-R', role: 'Refined particle size distribution & sensor validation' },
    ],
    keyFindings: [
      'Measurement of smoke particle size distributions across pre-combustion pyrolysis stages',
      'Identification of particulate agglomeration variances between 1-g and microgravity smoke',
      'Engineering guidelines for next-generation ISS and Artemis habitat smoke detector sensors',
    ],
  },
  {
    title: 'Gaseous Flame Diagnostics & Soot Chemistry (ACME Series)',
    icon: Sparkles,
    description:
      'Laminar gaseous diffusion flames exploring soot generation, electrical field flame manipulation, and spherical extinction.',
    focus: 'Fundamental combustion kinetics and emission reductions applicable to terrestrial clean energy and aerospace propulsion.',
    investigations: [
      { id: 'PSI-10', title: 'Flame Design', role: 'Spherically symmetric diffusion flames & soot inception' },
      { id: 'PSI-21', title: 'CLD Flame', role: 'Coflow laminar diffusion flames & radiation' },
      { id: 'PSI-22', title: 'E-FIELD', role: 'Electric-field ionic manipulation of soot emissions' },
      { id: 'PSI-159', title: 'CFI-G', role: 'Cool flames investigation with gaseous fuels' },
      { id: 'PSI-62', title: 'PSI-62', role: 'Flamelet generated manifold modeling' },
    ],
    keyFindings: [
      'Elimination of buoyancy enables rigorous testing of detailed reaction mechanisms',
      'Measurement of soot inception thresholds in counterflow and co-flow configurations',
      'Electric field interaction with flame ions to control thermal transfer and soot output',
    ],
  },
]

export function ResearchThemes() {
  return (
    <ChartCard
      title="Recurring Research Themes"
      description="Dominant combustion and fire-safety experimental programs identified across the curated investigations."
      icon={Flame}
      footerNote="Themes are identified from curated investigation objectives, approaches, and ISA-Tab archive study records."
    >
      <div className="space-y-4">
        {combustionThemes.map((theme) => (
          <div
            key={theme.title}
            className="rounded-lg border border-border/70 bg-card p-4 space-y-3 transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="grid size-6 place-items-center rounded bg-primary/10 text-primary">
                    <theme.icon className="size-3.5" aria-hidden="true" />
                  </div>
                  <h4 className="text-sm font-semibold tracking-tight text-foreground">
                    {theme.title}
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {theme.description}
                </p>
              </div>
            </div>

            <div className="rounded-md bg-muted/30 p-2.5 text-xs space-y-1 border border-border/40">
              <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
                Research Focus
              </span>
              <p className="text-muted-foreground leading-relaxed">{theme.focus}</p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Supporting NASA Investigations
              </span>
              <div className="flex flex-wrap gap-2">
                {theme.investigations.map((inv) => (
                  <Link
                    key={inv.id}
                    to={`/investigations/${encodeURIComponent(inv.id)}`}
                    className="group inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:border-primary hover:text-primary"
                  >
                    <span className="font-mono text-primary font-bold">{inv.id}</span>
                    <span className="text-muted-foreground group-hover:text-primary">
                      · {inv.title}
                    </span>
                    <ExternalLink className="size-2.5 opacity-50 group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-1 border-t border-border/50 pt-2 text-[11px]">
              <span className="font-semibold text-muted-foreground">Key Dataset Findings:</span>
              <ul className="space-y-1 list-disc list-inside text-muted-foreground pl-1">
                {theme.keyFindings.map((finding, i) => (
                  <li key={i} className="leading-relaxed">
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}
