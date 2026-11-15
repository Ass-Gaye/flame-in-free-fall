import {
  BarChart3,
  BookOpen,
  Download,
  FlaskConical,
  LayoutDashboard,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  description: string
  end?: boolean
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Overview',
        to: '/',
        icon: LayoutDashboard,
        description: 'Collection summary and entry points',
        end: true,
      },
      {
        label: 'Investigations',
        to: '/investigations',
        icon: FlaskConical,
        description: 'Search and browse PSI records',
      },
      {
        label: 'Research Analytics',
        to: '/analytics',
        icon: BarChart3,
        description: 'Distributions, themes, and gaps',
      },
      {
        label: 'Research Library',
        to: '/library',
        icon: BookOpen,
        description: 'Publications and documents',
      },
      {
        label: 'AI Research Assistant',
        to: '/assistant',
        icon: Sparkles,
        description: 'Grounded answers with citations',
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Export Center',
        to: '/export',
        icon: Download,
        description: 'JSON and CSV exports',
      },
      {
        label: 'Settings',
        to: '/settings',
        icon: Settings,
        description: 'Appearance, data, and AI setup',
      },
    ],
  },
]

export const routeTitles: Record<string, string> = {
  '/': 'Overview',
  '/investigations': 'Investigations',
  '/analytics': 'Research Analytics',
  '/library': 'Research Library',
  '/assistant': 'AI Research Assistant',
  '/export': 'Export Center',
  '/settings': 'Settings',
}

export function pageTitle(pathname: string): string {
  if (routeTitles[pathname]) {
    return routeTitles[pathname]
  }
  if (pathname.startsWith('/investigations/')) {
    return 'Investigation Details'
  }
  return 'Not Found'
}
