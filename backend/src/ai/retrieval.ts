import type { PrismaClient } from '../generated/prisma/client.js'
import type { RetrievedInvestigation } from './types.js'

const STOPWORDS = new Set([
  'a',
  'about',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'can',
  'do',
  'does',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'me',
  'of',
  'on',
  'or',
  'show',
  'tell',
  'the',
  'their',
  'there',
  'these',
  'they',
  'this',
  'to',
  'was',
  'what',
  'when',
  'where',
  'which',
  'who',
  'will',
  'with',
])

export function extractTokens(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
}

export function extractInvestigationIds(query: string): string[] {
  const matches = query.toUpperCase().match(/PSI-\d+/g)
  return matches ? [...new Set(matches)] : []
}

export interface RetrievalOptions {
  limit?: number
  minScore?: number
}

export async function retrieveInvestigations(
  prisma: PrismaClient,
  query: string,
  options: RetrievalOptions = {},
): Promise<RetrievedInvestigation[]> {
  const limit = options.limit ?? 4
  const minScore = options.minScore ?? 30

  const rawQuery = query.trim()
  const lowerQuery = rawQuery.toLowerCase()
  const tokens = extractTokens(rawQuery)
  const explicitIds = extractInvestigationIds(rawQuery)

  const rows = await prisma.investigation.findMany({
    include: {
      _count: {
        select: {
          publications: true,
          documents: true,
        },
      },
    },
  })

  const scored = rows
    .map((row) => {
      let score = 0
      const id = row.investigation_id.toUpperCase()
      const title = row.title.toLowerCase()
      const keywords = row.keywords.toLowerCase()
      const objectives = row.objectives.toLowerCase()
      const approach = row.approach.toLowerCase()
      const area = row.research_area.toLowerCase()
      const reason = row.relevance_reason.toLowerCase()

      // Explicit ID mention
      if (explicitIds.includes(id)) {
        score += 1000
      }

      // Exact phrase match in title or keywords
      if (lowerQuery.length > 3) {
        if (title.includes(lowerQuery)) score += 300
        if (keywords.includes(lowerQuery)) score += 200
        if (objectives.includes(lowerQuery)) score += 100
      }

      // Token matches
      for (const token of tokens) {
        if (id.toLowerCase().includes(token)) score += 150
        if (title.includes(token)) score += 40
        if (keywords.includes(token)) score += 25
        if (objectives.includes(token)) score += 12
        if (approach.includes(token)) score += 10
        if (area.includes(token)) score += 15
        if (reason.includes(token)) score += 10
      }

      // Prioritize direct and supporting relevance for queries with substantive topic matches
      if (score >= 30) {
        if (row.relevance_category === 'direct') {
          score += 20
        } else if (row.relevance_category === 'supporting') {
          score += 10
        }
      }

      return {
        row,
        score,
      }
    })
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score || a.row.relevance_rank - b.row.relevance_rank)
    .slice(0, limit)

  return scored.map(({ row }) => ({
    investigation_id: row.investigation_id,
    title: row.title,
    url: row.url || null,
    research_area: row.research_area,
    project_type: row.project_type || null,
    objectives: row.objectives || null,
    approach: row.approach || null,
    relevance_category: row.relevance_category,
    relevance_score: row.relevance_score,
    relevance_reason: row.relevance_reason || null,
    is_combustion_related: row.is_combustion_related,
    publication_count: row._count.publications,
    document_count: row._count.documents,
  }))
}
