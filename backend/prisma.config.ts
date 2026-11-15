import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

const backendRoot = fileURLToPath(new URL('.', import.meta.url))

loadEnv({ path: path.join(backendRoot, '.env') })

/**
 * Resolve a SQLite `file:` URL against the backend directory so the Prisma CLI
 * and the runtime adapter always point at the same database, regardless of the
 * current working directory.
 */
function resolveDatabaseUrl(raw: string | undefined): string {
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

export default defineConfig({
  schema: path.join(backendRoot, 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(backendRoot, 'prisma', 'migrations'),
  },
  datasource: {
    url: resolveDatabaseUrl(process.env.DATABASE_URL),
  },
})
