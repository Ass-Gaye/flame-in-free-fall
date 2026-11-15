import { createApp } from './app.js'
import { config } from './config.js'
import { prisma } from './db.js'

const app = createApp()

const server = app.listen(config.port, () => {
  console.log(
    `flame-in-freefall API listening on http://localhost:${config.port} (${config.nodeEnv})`,
  )
  console.log(`Database: ${config.databaseUrl}`)
})

let shuttingDown = false

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) {
    return
  }
  shuttingDown = true

  console.log(`Received ${signal}. Closing the API server.`)

  // Force-exit if open connections keep the server from closing.
  const timer = setTimeout(() => {
    console.error('Shutdown timed out; forcing exit.')
    process.exit(1)
  }, 10_000)
  timer.unref()

  server.close(() => {
    void prisma
      .$disconnect()
      .catch((error: unknown) => {
        console.error('Failed to disconnect Prisma cleanly:', error)
      })
      .finally(() => {
        clearTimeout(timer)
        process.exit(0)
      })
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
