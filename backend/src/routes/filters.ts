import { Router } from 'express'

import type { PrismaClient } from '../generated/prisma/client.js'
import { asyncHandler } from '../lib/async-handler.js'
import { getFilters } from '../services/filters.js'

export function createFiltersRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(await getFilters(prisma))
    }),
  )

  return router
}
