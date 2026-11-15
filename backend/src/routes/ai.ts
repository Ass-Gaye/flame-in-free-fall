import { Router } from 'express'
import { z } from 'zod'

import { getAiProvider } from '../ai/factory.js'
import { buildUserPrompt, SYSTEM_PROMPT } from '../ai/prompts.js'
import { retrieveInvestigations } from '../ai/retrieval.js'
import type { AiProvider, AiQueryResponse, InvestigationCitation } from '../ai/types.js'
import { prisma as defaultPrisma } from '../db.js'
import type { PrismaClient } from '../generated/prisma/client.js'
import { asyncHandler } from '../lib/async-handler.js'
import { ApiError } from '../lib/errors.js'

export interface CreateAiRouterOptions {
  prisma?: PrismaClient
  provider?: AiProvider
}

const querySchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, 'Query must be at least 2 characters')
    .max(500, 'Query must not exceed 500 characters'),
})

export function createAiRouter(options: CreateAiRouterOptions = {}): Router {
  const router = Router()
  const prisma = options.prisma ?? defaultPrisma

  router.get(
    '/status',
    asyncHandler(async (_req, res) => {
      const provider = options.provider ?? getAiProvider()
      const status = await provider.getStatus()
      res.json(status)
    }),
  )

  router.post(
    '/query',
    asyncHandler(async (req, res) => {
      const parsed = querySchema.parse(req.body)
      const provider = options.provider ?? getAiProvider()

      // Retrieve relevant investigations from NASA PSI SQLite dataset
      const investigations = await retrieveInvestigations(prisma, parsed.query)

      const citations: InvestigationCitation[] = investigations.map((inv) => ({
        investigation_id: inv.investigation_id,
        title: inv.title,
        url: inv.url,
        relevance_category: inv.relevance_category,
        research_area: inv.research_area,
      }))

      // If no relevant investigations exist in the dataset, refuse grounded answer
      if (investigations.length === 0) {
        const response: AiQueryResponse = {
          success: true,
          answer:
            'The collected NASA PSI dataset does not contain investigations matching this query. Please explore combustion topics (e.g. flame spread, soot, extinction, flammability) or search by specific PSI identifier (e.g. PSI-10, PSI-22).',
          provider: provider.name,
          model: provider.model,
          investigations: [],
        }
        res.json(response)
        return
      }

      // Format prompt grounded exclusively on retrieved records
      const userPrompt = buildUserPrompt(parsed.query, investigations)

      try {
        const result = await provider.generateAnswer({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt,
        })

        const response: AiQueryResponse = {
          success: true,
          answer: result.answer,
          provider: result.provider,
          model: result.model,
          investigations: citations,
        }
        res.json(response)
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'AI generation failed unexpectedly.'
        throw new ApiError(503, 'ai_generation_unavailable', message)
      }
    }),
  )

  return router
}
