import { Hono } from 'hono'
import axios from 'axios'

const app = new Hono()

let proxyOrigin: string | undefined;

export const configureProxyOrigin = (origin?: string) => {
  proxyOrigin = origin
}

// Hop-by-hop headers must not be forwarded between hops
const HOP_BY_HOP = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]

app.all('*', async (c) => {
  if (!proxyOrigin) {
    return c.text('Proxy not configured. Use --origin to set the target URL.', 404)
  }
  
  // Build the target URL from the origin plus the incoming path/query.
  // c.req.url is already absolute, so it must be split before joining.
  const incoming = new URL(c.req.url)
  const target = new URL(`${incoming.pathname}${incoming.search}`, proxyOrigin).toString()
  
  let body: any = undefined
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const arrayBuffer = await c.req.arrayBuffer()
    body = Buffer.from(arrayBuffer).toString('utf-8')
  }
  
  // Forward request headers, dropping hop-by-hop and host (axios sets the target host)
  const headers: Record<string, string> = {}
  Object.entries(c.req.header() || {}).forEach(([key, value]) => {
    const lower = key.toLowerCase()
    if (!HOP_BY_HOP.includes(lower) && lower !== 'host' && lower !== 'content-length') {
      headers[key] = value
    }
  })
  
  try {
    const response = await axios({
      method: c.req.method,
      url: target,
      data: body,
      responseType: 'arraybuffer',
      headers: headers,
      // Forward any status code as-is instead of throwing on 4xx/5xx
      validateStatus: () => true,
    })
    
    const responseHeaders: Record<string, string> = {}
    Object.entries(response.headers).forEach(([key, value]) => {
      const lower = key.toLowerCase()
      // content-encoding/content-length describe the encoded upstream body; axios
      // already decompressed it, so drop them to keep the framing consistent.
      if (!HOP_BY_HOP.includes(lower) && lower !== 'content-length' && lower !== 'content-encoding') {
        responseHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value)
      }
    })
    
    return new Response(response.data, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    return c.json({ error: 'Proxy request failed', message: error.message }, 502)
  }
})

export default app
