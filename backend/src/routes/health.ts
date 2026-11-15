import { Router } from 'express'

import { config } from '../config.js'
import type { PrismaClient } from '../generated/prisma/client.js'
import { asyncHandler } from '../lib/async-handler.js'
import { getDatasetMeta } from '../lib/meta.js'

export function createHealthRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const investigations = await prisma.investigation.count()
      const dataset = await getDatasetMeta(prisma)

      res.json({
        status: 'ok',
        service: 'flame-in-freefall-api',
        environment: config.nodeEnv,
        database: { provider: 'sqlite', connected: true },
        investigations_loaded: investigations,
        dataset,
      })
    }),
  )

  return router
}
