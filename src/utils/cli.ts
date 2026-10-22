import { flagParser } from './flagParser'
import { start } from '../index'

function run() {
  const args = process.argv.slice(2)
  const flags = flagParser(args)

  if (flags.clearCache) {
    console.log('Clearing cache...')
    return
  }

  const port = flags.port ?? 3000
  start(port)
}

if (require.main === module) {
  run()
}

export default run