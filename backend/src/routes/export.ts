import fs from 'node:fs'
import { Router } from 'express'

import { config } from '../config.js'
import type { PrismaClient } from '../generated/prisma/client.js'
import { asyncHandler } from '../lib/async-handler.js'
import { ApiError } from '../lib/errors.js'
import { exportQuerySchema } from '../schemas/query.js'
import {
  getFilteredInvestigationRawRecords,
  recordsToCsv,
} from '../services/investigations.js'
import { getStatistics } from '../services/statistics.js'

export function createExportRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = exportQuerySchema.parse(req.query)

      // 1. Export research statistics
      if (query.type === 'statistics') {
        const stats = await getStatistics(prisma)
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="flame-in-freefall-statistics.json"',
        )
        res.send(JSON.stringify(stats, null, 2))
        return
      }

      // 2. Export single investigation
      if (query.id) {
        const row = await prisma.investigation.findUnique({
          where: { investigation_id: query.id },
          select: { raw_json: true },
        })

        if (!row) {
          throw new ApiError(
            404,
            'investigation_not_found',
            `Investigation ${query.id} was not found in the dataset.`,
          )
        }

        const record = JSON.parse(row.raw_json) as Record<string, unknown>

        if (query.format === 'csv') {
          res.setHeader('Content-Type', 'text/csv; charset=utf-8')
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="flame-in-freefall-${query.id}.csv"`,
          )
          res.send(recordsToCsv([record]))
          return
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="flame-in-freefall-${query.id}.json"`,
        )
        res.send(JSON.stringify(record, null, 2))
        return
      }

      const hasFilters = Boolean(
        query.q ||
          (query.relevance && query.relevance.length > 0) ||
          (query.area && query.area.length > 0) ||
          (query.project_type && query.project_type.length > 0) ||
          (query.status && query.status.length > 0),
      )

      // 3. Filtered export
      if (hasFilters) {
        const records = await getFilteredInvestigationRawRecords(prisma, query)

        if (query.format === 'csv') {
          res.setHeader('Content-Type', 'text/csv; charset=utf-8')
          res.setHeader(
            'Content-Disposition',
            'attachment; filename="flame-in-freefall-filtered.csv"',
          )
          res.send(recordsToCsv(records))
          return
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="flame-in-freefall-filtered.json"',
        )
        res.send(JSON.stringify(records, null, 2))
        return
      }

      // 4. Full dataset exports streamed directly from disk
      if (query.format === 'json') {
        if (!fs.existsSync(config.dataSourcePath)) {
          throw new ApiError(
            404,
            'dataset_not_found',
            'Source JSON dataset file could not be found.',
          )
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="flame-in-freefall-dataset.json"',
        )
        fs.createReadStream(config.dataSourcePath).pipe(res)
        return
      }

      if (query.format === 'csv') {
        const csvPath = config.dataSourcePath.replace(/\.json$/i, '.csv')

        if (!fs.existsSync(csvPath)) {
          throw new ApiError(
            404,
            'dataset_not_found',
            'Generated CSV dataset file could not be found.',
          )
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="flame-in-freefall-dataset.csv"',
        )
        fs.createReadStream(csvPath).pipe(res)
        return
      }
    }),
  )

  return router
}
