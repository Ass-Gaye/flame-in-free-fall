import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'

import { buildUserPrompt, SYSTEM_PROMPT } from '../src/ai/prompts.js'
import { retrieveInvestigations } from '../src/ai/retrieval.js'
import type { AiGenerateOptions, AiGenerateResult, AiProvider, AiStatusResult } from '../src/ai/types.js'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'

afterAll(async () => {
  await prisma.$disconnect()
})

describe('NASA PSI Dataset Retrieval Engine', () => {
  it('retrieves an exact investigation when its PSI ID is queried', async () => {
    const results = await retrieveInvestigations(prisma, 'Tell me about PSI-10 and its goals')
    expect(results.length).toBeGreaterThan(0)
    const first = results[0]!
    expect(first.investigation_id).toBe('PSI-10')
    expect(first.title).toBeDefined()
    expect(['direct', 'supporting']).toContain(first.relevance_category)
  })

  it('retrieves combustion fire-safety records for flame spread queries', async () => {
    const results = await retrieveInvestigations(prisma, 'flame spread in microgravity')
    expect(results.length).toBeGreaterThan(0)

    const ids = results.map((r) => r.investigation_id)
    // Flame spread queries should retrieve direct investigations
    expect(results.some((r) => r.relevance_category === 'direct')).toBe(true)
    expect(ids.length).toBeLessThanOrEqual(4)
  })

  it('retrieves records for extinction and suppression queries', async () => {
    const results = await retrieveInvestigations(prisma, 'suppression and flame extinction')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.is_combustion_related || r.relevance_category === 'direct')).toBe(true)
  })

  it('returns empty results for completely out-of-dataset queries', async () => {
    const results = await retrieveInvestigations(prisma, 'what is the capital of France in Europe?')
    expect(results).toHaveLength(0)
  })
})

describe('Grounded Prompt Builder', () => {
  it('formats investigation context and includes grounding instructions', async () => {
    const results = await retrieveInvestigations(prisma, 'PSI-10')
    const prompt = buildUserPrompt('What does PSI-10 test?', results)

    expect(prompt).toContain('RETRIEVED NASA PSI INVESTIGATION RECORDS:')
    expect(prompt).toContain('[PSI-10]')
    expect(prompt).toContain('USER RESEARCH QUESTION:')
    expect(prompt).toContain('What does PSI-10 test?')
    expect(SYSTEM_PROMPT).toContain('CRITICAL GROUNDING RULES')
  })
})

describe('POST /api/ai/query Endpoint', () => {
  const mockProvider: AiProvider = {
    name: 'ollama',
    model: 'gemma4:e2b',
    async getStatus(): Promise<AiStatusResult> {
      return {
        success: true,
        provider: 'ollama',
        configured: true,
        available: true,
        model: 'gemma4:e2b',
      }
    },
    async generateAnswer(options: AiGenerateOptions): Promise<AiGenerateResult> {
      expect(options.userPrompt).toContain('[PSI-')
      return {
        answer: 'Based on [PSI-10], the BASS-II investigation studies flame behavior on solid fuels.',
        provider: 'ollama',
        model: 'gemma4:e2b',
      }
    },
  }

  const app = createApp({ prisma, aiProvider: mockProvider })

  it('validates query presence and length', async () => {
    const emptyResponse = await request(app)
      .post('/api/ai/query')
      .send({ query: '' })
      .expect(400)

    expect(emptyResponse.body.error.code).toBe('validation_error')

    const missingResponse = await request(app)
      .post('/api/ai/query')
      .send({})
      .expect(400)

    expect(missingResponse.body.error.code).toBe('validation_error')
  })

  it('returns a grounded refusal when no matching investigation is found', async () => {
    const response = await request(app)
      .post('/api/ai/query')
      .send({ query: 'xylophone recipe for blueberry cupcakes and pineapple smoothie' })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.answer).toContain('does not contain investigations matching this query')
    expect(response.body.investigations).toEqual([])
  })

  it('generates grounded answers with investigation citations when relevant records exist', async () => {
    const response = await request(app)
      .post('/api/ai/query')
      .send({ query: 'Which investigations study flame spread?' })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.provider).toBe('ollama')
    expect(response.body.model).toBe('gemma4:e2b')
    expect(response.body.answer).toContain('[PSI-10]')
    expect(response.body.investigations.length).toBeGreaterThan(0)
    expect(response.body.investigations[0]).toMatchObject({
      investigation_id: expect.stringMatching(/^PSI-/),
      title: expect.any(String),
      relevance_category: expect.any(String),
      research_area: expect.any(String),
    })
  })

  it('handles provider generation errors with 503 status', async () => {
    const failingProvider: AiProvider = {
      name: 'ollama',
      model: 'gemma4:e2b',
      async getStatus(): Promise<AiStatusResult> {
        return { success: true, provider: 'ollama', configured: true, available: false, model: 'gemma4:e2b' }
      },
      async generateAnswer(): Promise<AiGenerateResult> {
        throw new Error('Connection refused by local Ollama service')
      },
    }

    const failingApp = createApp({ prisma, aiProvider: failingProvider })
    const response = await request(failingApp)
      .post('/api/ai/query')
      .send({ query: 'PSI-10 flame spread' })
      .expect(503)

    expect(response.body.error.code).toBe('ai_generation_unavailable')
    expect(response.body.error.message).toContain('Connection refused')
  })
})
