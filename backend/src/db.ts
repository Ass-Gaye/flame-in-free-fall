import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

import { config } from './config.js'
import { PrismaClient } from './generated/prisma/client.js'

/**
 * Create a Prisma client for a specific SQLite URL.
 *
 * Tests use this to point at a temporary copy of the database. The production
 * entry point uses the shared client below.
 */
export function createPrismaClient(databaseUrl = config.databaseUrl) {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl })
  return new PrismaClient({ adapter })
}

export const prisma = createPrismaClient()
