import { describe, expect, it } from 'vitest'

import {
  readCsvParam,
  readEnumParam,
  readIntParam,
  readParam,
} from '@/lib/query-state'

function params(query: string): URLSearchParams {
  return new URLSearchParams(query)
}

describe('query string readers', () => {
  it('reads and trims scalar values', () => {
    expect(readParam(params('q=%20BASS%20'), 'q')).toBe('BASS')
    expect(readParam(params(''), 'q')).toBe('')
  })

  it('splits CSV filter values and drops blanks', () => {
    expect(readCsvParam(params('relevance=direct,peripheral'), 'relevance')).toEqual([
      'direct',
      'peripheral',
    ])
    expect(readCsvParam(params('relevance=direct,,%20'), 'relevance')).toEqual([
      'direct',
    ])
    expect(readCsvParam(params(''), 'relevance')).toEqual([])
  })

  it('falls back for invalid enums instead of forwarding them to the API', () => {
    const allowed = ['grouped', 'entries'] as const
    expect(readEnumParam(params('view=entries'), 'view', allowed, 'grouped')).toBe(
      'entries',
    )
    expect(readEnumParam(params('view=bogus'), 'view', allowed, 'grouped')).toBe(
      'grouped',
    )
  })

  it('only accepts positive page numbers', () => {
    expect(readIntParam(params('page=3'), 'page', 1)).toBe(3)
    expect(readIntParam(params('page=0'), 'page', 1)).toBe(1)
    expect(readIntParam(params('page=abc'), 'page', 1)).toBe(1)
    expect(readIntParam(params(''), 'page', 1)).toBe(1)
  })
})
