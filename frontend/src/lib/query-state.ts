/**
 * URL-backed list state.
 *
 * Search, filters, sorting, and pagination live in the query string so a view
 * can be shared, reloaded, and restored with the browser back button.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export function readParam(params: URLSearchParams, key: string): string {
  return (params.get(key) ?? '').trim()
}

export function readCsvParam(params: URLSearchParams, key: string): string[] {
  return readParam(params, key)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function readIntParam(
  params: URLSearchParams,
  key: string,
  fallback: number,
): number {
  const value = Number.parseInt(readParam(params, key), 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export function readEnumParam<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = readParam(params, key)
  return allowed.includes(value as T) ? (value as T) : fallback
}

interface UpdateOptions {
  resetPage?: boolean
  replace?: boolean
}

export function useUrlQueryState() {
  const [params, setParams] = useSearchParams()

  const update = useCallback(
    (patch: Record<string, string | number | null>, options: UpdateOptions = {}) => {
      const { resetPage = true, replace = false } = options

      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)

          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === '') {
              next.delete(key)
            } else {
              next.set(key, String(value))
            }
          }

          if (resetPage) {
            next.delete('page')
          }

          return next
        },
        { replace },
      )
    },
    [setParams],
  )

  const setPage = useCallback(
    (page: number) => {
      update({ page: page > 1 ? page : null }, { resetPage: false })
    },
    [update],
  )

  const clearAll = useCallback(
    (keep: string[] = []) => {
      const next = new URLSearchParams()
      for (const key of keep) {
        const value = params.get(key)
        if (value) {
          next.set(key, value)
        }
      }
      setParams(next)
    },
    [params, setParams],
  )

  return { params, update, setPage, clearAll }
}

/**
 * Keeps a text input responsive while writing its value to the URL after a
 * short pause. External URL changes (back button, clear link) resync the field.
 */
export function useDebouncedSearchParam(
  value: string,
  apply: (value: string) => void,
  delay = 300,
): [string, (value: string) => void] {
  const [input, setInput] = useState(value)
  const [debounced, setDebounced] = useState(value)
  const applied = useRef(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(input), delay)
    return () => window.clearTimeout(timer)
  }, [input, delay])

  useEffect(() => {
    if (debounced === applied.current) {
      return
    }
    applied.current = debounced
    apply(debounced)
  }, [apply, debounced])

  useEffect(() => {
    if (value !== applied.current) {
      applied.current = value
      setInput(value)
      setDebounced(value)
    }
  }, [value])

  return [input, setInput]
}
