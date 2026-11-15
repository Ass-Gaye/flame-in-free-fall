import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'

import { config } from './config.js'
import { prisma as defaultPrisma } from './db.js'
import type { AiProvider } from './ai/types.js'
import type { PrismaClient } from './generated/prisma/client.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { createApiRouter } from './routes/index.js'

export interface CreateAppOptions {
  /** Inject a client so tests can point at an isolated database. */
  prisma?: PrismaClient
  /** Inject an AI provider so tests can verify behavior with mocks or custom config. */
  aiProvider?: AiProvider
}

export function createApp(options: CreateAppOptions = {}): Express {
  const prisma = options.prisma ?? defaultPrisma
  const app = express()

  app.disable('x-powered-by')
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )

  const allowedOrigins = new Set(config.corsOrigins)

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true)
          return
        }

        const clean = origin.replace(/\/+$/, '')

        if (
          allowedOrigins.has(clean) ||
          (config.nodeEnv !== 'production' &&
            /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clean))
        ) {
          callback(null, true)
          return
        }

        callback(null, false)
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '100kb' }))

  app.use('/api', createApiRouter(prisma, { aiProvider: options.aiProvider }))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
