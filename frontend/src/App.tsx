import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
import { ThemeProvider } from '@/lib/theme'
import { AnalyticsPage } from '@/pages/analytics'
import { AssistantPage } from '@/pages/assistant'
import { ExportCenterPage } from '@/pages/export-center'
import { InvestigationDetailPage } from '@/pages/investigation-detail'
import { InvestigationsPage } from '@/pages/investigations'
import { LibraryPage } from '@/pages/library'
import { NotFoundPage } from '@/pages/not-found'
import { OverviewPage } from '@/pages/overview'
import { SettingsPage } from '@/pages/settings'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="investigations" element={<InvestigationsPage />} />
            <Route
              path="investigations/:investigationId"
              element={<InvestigationDetailPage />}
            />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="export" element={<ExportCenterPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
