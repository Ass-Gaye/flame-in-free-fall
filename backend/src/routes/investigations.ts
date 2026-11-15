import { Router } from 'express'

import type { PrismaClient } from '../generated/prisma/client.js'
import { asyncHandler } from '../lib/async-handler.js'
import { ApiError } from '../lib/errors.js'
import {
  investigationIdSchema,
  investigationListQuerySchema,
} from '../schemas/query.js'
import {
  getInvestigation,
  listInvestigations,
} from '../services/investigations.js'

export function createInvestigationsRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = investigationListQuerySchema.parse(req.query)
      res.json(await listInvestigations(prisma, query))
    }),
  )

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = investigationIdSchema.parse(req.params.id)
      const investigation = await getInvestigation(prisma, id)

      if (!investigation) {
        throw new ApiError(
          404,
          'investigation_not_found',
          `Investigation ${id} was not found in the dataset.`,
        )
      }

      res.json(investigation)
    }),
  )

  return router
}
