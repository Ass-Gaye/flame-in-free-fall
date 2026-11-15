import { Router } from 'express'

import type { PrismaClient } from '../generated/prisma/client.js'
import { asyncHandler } from '../lib/async-handler.js'
import { publicationsQuerySchema } from '../schemas/query.js'
import { listPublications } from '../services/publications.js'

export function createPublicationsRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = publicationsQuerySchema.parse(req.query)
      res.json(await listPublications(prisma, query))
    }),
  )

  return router
}
