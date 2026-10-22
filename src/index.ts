import app, { configureProxyOrigin } from './app'
import { flagParser, ParsedFlags } from './utils/flagParser'

let server: Bun.Server | null = null
let flags: ParsedFlags = {}

export function start(port: number): void {
  // Configure proxy origin from flags before starting the server
  configureProxyOrigin(flags.origin)
  
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
    process.exit(0)
  }

  start(flags.port ?? 3000)
}
