import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

import { parseAiProvider } from './ai/types.js'

const backendRoot = fileURLToPath(new URL('..', import.meta.url))

loadEnv({ path: path.join(backendRoot, '.env') })

function parsePort(raw: string | undefined): number {
  const value = Number.parseInt(raw ?? '3001', 10)
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`Invalid PORT value: ${raw ?? '(unset)'}`)
  }
  return value
}

/**
 * Resolve a SQLite `file:` URL against the backend directory so the Prisma CLI
 * and the runtime adapter always point at the same database file.
 */
export function resolveDatabaseUrl(raw: string | undefined): string {
  const value = raw?.trim() || 'file:./prisma/dev.db'

  if (!value.startsWith('file:')) {
    return value
  }

  const target = value.slice('file:'.length)
  const resolved = path.isAbsolute(target)
    ? target
    : path.resolve(backendRoot, target)

  return `file:${resolved.replace(/\\/g, '/')}`
}

const dataSourceRaw =
  process.env.DATA_SOURCE_PATH ??
  '../nasa-fire-data/psi_output/merged_master_dataset.json'

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsePort(process.env.PORT),
  databaseUrl: resolveDatabaseUrl(process.env.DATABASE_URL),
  corsOrigins: (
    process.env.CORS_ORIGIN ?? 'http://localhost:5174,http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  dataSourcePath: path.isAbsolute(dataSourceRaw)
    ? dataSourceRaw
    : path.resolve(backendRoot, dataSourceRaw),
  ai: {
    provider: parseAiProvider(process.env.AI_PROVIDER),
    ollama: {
      baseUrl: (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').trim(),
      model: (process.env.OLLAMA_MODEL || 'gemma4:e2b').trim(),
    },
    gemini: {
      apiKey: (process.env.GEMINI_API_KEY || '').trim(),
      model: (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim(),
    },
  },
}
