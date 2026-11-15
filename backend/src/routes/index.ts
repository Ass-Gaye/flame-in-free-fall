import { Router } from 'express'

import type { PrismaClient } from '../generated/prisma/client.js'
import { createDocumentsRouter } from './documents.js'
import { createFiltersRouter } from './filters.js'
import { createHealthRouter } from './health.js'
import { createInvestigationsRouter } from './investigations.js'
import { createPublicationsRouter } from './publications.js'
import { createStatisticsRouter } from './statistics.js'

/**
 * Read-only API. Every endpoint is a GET; no mutation route exists by design.
 */
export function createApiRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json({
      service: 'flame-in-freefall-api',
      version: '0.1.0',
      read_only: true,
      endpoints: [
        'GET /api/health',
        'GET /api/investigations',
        'GET /api/investigations/:id',
        'GET /api/statistics',
        'GET /api/filters',
        'GET /api/publications',
        'GET /api/documents',
      ],
    })
  })

  router.use('/health', createHealthRouter(prisma))
  router.use('/investigations', createInvestigationsRouter(prisma))
  router.use('/statistics', createStatisticsRouter(prisma))
  router.use('/filters', createFiltersRouter(prisma))
  router.use('/publications', createPublicationsRouter(prisma))
  router.use('/documents', createDocumentsRouter(prisma))

  return router
}
