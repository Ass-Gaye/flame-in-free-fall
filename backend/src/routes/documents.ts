import { Router } from 'express'

import type { PrismaClient } from '../generated/prisma/client.js'
import { asyncHandler } from '../lib/async-handler.js'
import { documentsQuerySchema } from '../schemas/query.js'
import { listDocuments } from '../services/documents.js'

export function createDocumentsRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = documentsQuerySchema.parse(req.query)
      res.json(await listDocuments(prisma, query))
    }),
  )

  return router
}
