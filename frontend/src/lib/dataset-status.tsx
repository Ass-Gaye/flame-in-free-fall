/**
 * Shared dataset connection status.
 *
 * One `/api/health` request backs the sidebar badge, the top bar, the settings
 * page, and the overview provenance panel, so they cannot disagree.
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'

import { getHealth } from '@/lib/api'
import { useApiQuery } from '@/lib/api-hooks'
import type { DatasetMeta } from '@/types/api'

export type ConnectionState = 'connecting' | 'connected' | 'offline'

interface DatasetStatusValue {
  state: ConnectionState
  investigationsLoaded: number | null
  dataset: DatasetMeta | null
  databaseProvider: string | null
  error: string | null
  refresh: () => void
}

const DatasetStatusContext = createContext<DatasetStatusValue | null>(null)

export function DatasetStatusProvider({ children }: { children: ReactNode }) {
  const { data, error, retry } = useApiQuery('health', (signal) =>
    getHealth({ signal }),
  )

  const value = useMemo<DatasetStatusValue>(() => {
    if (data) {
      return {
        state: 'connected',
        investigationsLoaded: data.investigations_loaded,
        dataset: data.dataset,
        databaseProvider: data.database.provider,
        error: null,
        refresh: retry,
      }
    }

    return {
      state: error ? 'offline' : 'connecting',
      investigationsLoaded: null,
      dataset: null,
      databaseProvider: null,
      error: error?.message ?? null,
      refresh: retry,
    }
  }, [data, error, retry])

  return (
    <DatasetStatusContext.Provider value={value}>
      {children}
    </DatasetStatusContext.Provider>
  )
}

export function useDatasetStatus() {
  const context = useContext(DatasetStatusContext)
  if (!context) {
    throw new Error('useDatasetStatus must be used inside a DatasetStatusProvider')
  }
  return context
}
