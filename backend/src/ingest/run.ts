import { config } from '../config.js'
import { prisma } from '../db.js'
import { DatasetValidationError } from '../lib/errors.js'
import { ingestDataset } from './ingest.js'

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

async function main() {
  const args = process.argv.slice(2)
  const sourcePath = argValue(args, '--source') ?? config.dataSourcePath
  const force = args.includes('--force')
  const dryRun = args.includes('--dry-run')

  const summary = await ingestDataset({
    prisma,
    sourcePath,
    force,
    dryRun,
    logger: {
      info: (message) => console.log(message),
      warn: (message) => console.warn(message),
    },
  })

  if (summary.skipped) {
    console.log(
      `Dataset already ingested (${summary.datasetSha256.slice(0, 12)}…). Use --force to rebuild.`,
    )
  } else {
    console.log(
      `${dryRun ? 'Validated' : 'Ingested'} ${summary.recordCount} investigations, ${summary.publicationCount} publications, ${summary.documentCount} documents, ${summary.archiveCount} archives.`,
    )
    console.log(`Dataset SHA-256: ${summary.datasetSha256}`)
    console.log(`Source: ${summary.sourcePath}`)
  }

  if (summary.warnings.length > 0) {
    console.log(`${summary.warnings.length} warning(s):`)
    for (const warning of summary.warnings) {
      console.warn(`  - ${warning}`)
    }
  }
}

main()
  .catch((error: unknown) => {
    if (error instanceof DatasetValidationError) {
      console.error(`Dataset validation failed with ${error.issues.length} issue(s):`)
      for (const issue of error.issues) {
        console.error(`  - ${issue}`)
      }
    } else if (error instanceof Error) {
      console.error(error.message)
      if (config.nodeEnv === 'development') {
        console.error(error.stack)
      }
    } else {
      console.error(String(error))
    }
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
