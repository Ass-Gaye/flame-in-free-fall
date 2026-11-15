import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'

import { config } from './config.js'
import { prisma as defaultPrisma } from './db.js'
import type { PrismaClient } from './generated/prisma/client.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { createApiRouter } from './routes/index.js'

export interface CreateAppOptions {
  /** Inject a client so tests can point at an isolated database. */
  prisma?: PrismaClient
}

export function createApp(options: CreateAppOptions = {}): Express {
  const prisma = options.prisma ?? defaultPrisma
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(
    cors({
      origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
    }),
  )
  app.use(express.json({ limit: '100kb' }))

  app.use('/api', createApiRouter(prisma))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
