/**
 * Minimal data-fetching hooks over the Phase 2 API.
 *
 * The browser never loads the dataset directly. Every request goes through
 * `lib/api.ts`, is cancelled when its consumer unmounts, and keeps the last
 * successful payload so pagination and filtering do not blank the screen.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

interface CacheEntry {
  data: unknown
  storedAt: number
}

const responseCache = new Map<string, CacheEntry>()

const inFlightCounts = new Map<string, number>()
const fetchListeners = new Set<() => void>()

function emitFetchChange() {
  for (const listener of [...fetchListeners]) {
    listener()
  }
}

function beginFetch(key: string) {
  inFlightCounts.set(key, (inFlightCounts.get(key) ?? 0) + 1)
  emitFetchChange()
}

function endFetch(key: string) {
  const remaining = (inFlightCounts.get(key) ?? 0) - 1
  if (remaining > 0) {
    inFlightCounts.set(key, remaining)
  } else {
    inFlightCounts.delete(key)
  }
  emitFetchChange()
}

function subscribeToFetchState(listener: () => void) {
  fetchListeners.add(listener)
  return () => {
    fetchListeners.delete(listener)
  }
}

export function clearApiCache(prefix?: string) {
  if (!prefix) {
    responseCache.clear()
    return
  }
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) {
      responseCache.delete(key)
    }
  }
}

interface UseApiQueryOptions {
  enabled?: boolean
}

export interface ApiQueryResult<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  isFetching: boolean
  retry: () => void
}

export function useApiQuery<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  options: UseApiQueryOptions = {},
): ApiQueryResult<T> {
  const { enabled = true } = options
  const loadRef = useRef(load)

  const [attempt, setAttempt] = useState(0)
  const [dataState, setDataState] = useState<{ key: string; data: T | null }>(
    () => ({
      key,
      data: (responseCache.get(key)?.data as T | undefined) ?? null,
    }),
  )
  const [errorState, setErrorState] = useState<{
    key: string
    error: Error | null
  }>({ key, error: null })

  const isFetching = useSyncExternalStore(
    subscribeToFetchState,
    () => inFlightCounts.has(key),
    () => false,
  )

  // Keep the latest loader without making it a fetch dependency. Inline
  // closures change on every render; the request key is what should refetch.
  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const controller = new AbortController()
    let active = true
    let settled = false

    beginFetch(key)

    loadRef
      .current(controller.signal)
      .then((result) => {
        if (!active) {
          return
        }
        responseCache.set(key, { data: result, storedAt: Date.now() })
        setDataState({ key, data: result })
        setErrorState({ key, error: null })
      })
      .catch((caught: unknown) => {
        if (!active) {
          return
        }
        if (caught instanceof DOMException && caught.name === 'AbortError') {
          return
        }
        setErrorState({
          key,
          error: caught instanceof Error ? caught : new Error(String(caught)),
        })
      })
      .finally(() => {
        if (!active) {
          return
        }
        settled = true
        endFetch(key)
      })

    return () => {
      active = false
      controller.abort()
      if (!settled) {
        endFetch(key)
      }
    }
  }, [attempt, enabled, key])

  const retry = useCallback(() => {
    responseCache.delete(key)
    setErrorState({ key, error: null })
    setAttempt((current) => current + 1)
  }, [key])

  const data =
    dataState.key === key
      ? dataState.data
      : ((responseCache.get(key)?.data as T | undefined) ?? null)
  const error = errorState.key === key ? errorState.error : null

  return {
    data,
    error,
    isLoading: enabled && data === null && error === null,
    isFetching,
    retry,
  }
}
