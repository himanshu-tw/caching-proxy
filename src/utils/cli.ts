import { flagParser } from './flagParser'

function run() {
  const args = process.argv.slice(2);
  const flags = flagParser(args);
  
  if (flags.clearCache) {
    console.log('Clearing cache...');
    return;
  }
  
  if (flags.port) {
    console.log(`Starting proxy on port ${flags.port}`);
  }
  
  if (flags.origin) {
    console.log(`Proxying to origin: ${flags.origin}`);
  }
  
  console.log('Running caching-proxy');
}

if (require.main === module) {
  run();
}

export default run;