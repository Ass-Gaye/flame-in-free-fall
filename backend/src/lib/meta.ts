import type { PrismaClient } from '../generated/prisma/client.js'

export interface DatasetMeta {
  dataset_sha256: string | null
  ingested_at: string | null
  record_count: number | null
}

/**
 * Provenance for the dataset currently loaded into SQLite. Every aggregate
 * response carries this so a displayed number can be tied to an ingestion run.
 */
export async function getDatasetMeta(
  prisma: PrismaClient,
): Promise<DatasetMeta> {
  const run = await prisma.ingestionRun.findFirst({
    orderBy: { id: 'desc' },
  })

  if (!run) {
    return {
      dataset_sha256: null,
      ingested_at: null,
      record_count: null,
    }
  }

  return {
    dataset_sha256: run.dataset_sha256,
    ingested_at: run.finished_at.toISOString(),
    record_count: run.record_count,
  }
}
