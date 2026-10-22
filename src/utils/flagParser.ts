export interface ParsedFlags {
  port?: number;
  origin?: string;
  clearCache?: boolean;
}

export function flagParser(args: string[]): ParsedFlags {
  const flags: ParsedFlags = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--port') {
      const portValue = args[i + 1];
      if (portValue && !portValue.startsWith('--')) {
        const port = parseInt(portValue, 10);
        if (!isNaN(port)) {
          flags.port = port;
        }
        i++;
      }
    } else if (arg === '--origin') {
      const originValue = args[i + 1];
      if (originValue && !originValue.startsWith('--')) {
        flags.origin = originValue;
        i++;
      }
    } else if (arg === '--clear-cache') {
      flags.clearCache = true;
    }
  }
  
  return flags;
}