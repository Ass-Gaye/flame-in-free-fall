import { Router } from 'express'

import type { PrismaClient } from '../generated/prisma/client.js'
import { asyncHandler } from '../lib/async-handler.js'
import { getStatistics } from '../services/statistics.js'

export function createStatisticsRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(await getStatistics(prisma))
    }),
  )

  return router
}
