import app, { configureProxyOrigin } from './app'
import { flagParser, ParsedFlags } from './utils/flagParser'
import { connectRedis } from './config/redis'
import { clearAllCache } from './service/db'

let server: Bun.Server | null = null
let flags: ParsedFlags = {}

export async function start(port: number): Promise<void> {
  // Configure proxy origin from flags before starting the server
  configureProxyOrigin(flags.origin)
  
  // Connect to Redis
  await connectRedis()
  
  server = Bun.serve({
    port,
    fetch: app.fetch,
  })

  console.log(`Server running on http://localhost:${port}`)
  if (flags.origin) {
    console.log(`Proxy configured to forward requests to: ${flags.origin}`)
  }

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`)
    if (server) {
      server.stop()
      server = null
    }
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

// Auto-start when run directly as the entry point
if (import.meta.main) {
  flags = flagParser(process.argv.slice(2))

  if (flags.clearCache) {
    console.log('Clearing cache...')
    await connectRedis()
    const count = await clearAllCache()
    console.log(`Cleared ${count} cache entries`)
    process.exit(0)
  }

  await start(flags.port ?? 3000)
}
