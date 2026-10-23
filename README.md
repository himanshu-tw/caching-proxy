# Caching Proxy Server

A high-performance caching proxy server built with **Bun**, **Hono**, **Axios**, and **Redis**. This project implements a caching layer that sits between clients and origin servers, reducing latency and server load by caching GET responses.

This project is based on the [Roadmap.sh – Caching Server](https://roadmap.sh/projects/caching-server) guided project.

---

## Features

- **Reverse Proxy** – Forwards requests to a configurable upstream origin via `axios`.
- **Response Caching** – Caches GET responses in **Redis** with a configurable TTL (default: 60s).
- **Cache Hit/Miss Indicators** – Responses include an `X-Cache` header:
  - `X-Cache: HIT` – served from Redis cache.
  - `X-Cache: MISS` – fetched from origin and then cached.
- **Cache Management** – CLI flag to clear all cached entries.

---

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **HTTP Framework**: [Hono](https://hono.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Cache Store**: [Redis](https://redis.io/) (via `redis` client)
- **Env**: `dotenv`

---

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Start Redis

Make sure you have a Redis server running locally (or remotely).

**Local (Docker):**

```bash
docker run -p 6379:6379 redis
```

**Or via your system package manager:**

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# macOS
brew install redis
redis-server
```

### 3. Configure Redis URL (optional)

The Redis client defaults to `redis://localhost:6379`. You can override via environment variable:

```bash
REDIS_URl=redis://localhost:6379
```

---

## Running the Server

### Start with proxy origin

```bash
bun run dev --origin https://example.com
```

- `--origin`: The upstream origin to proxy requests to.

### Start without origin (to be set via flags)

```bash
bun run dev
```

### Clear cache

```bash
bun run dev --clear-cache
```

---

## Usage

### Proxy a request

```bash
curl -i http://localhost:3000/some-path
```

Response headers include:

```
X-Cache: MISS   # first time → fetched from origin and cached
X-Cache: HIT    # subsequent within TTL → served from cache
```

### Test caching flow

1. **First request** (cache miss):

```bash
curl -i http://localhost:3000/get
# → X-Cache: MISS
```

2. **Second request** (cache hit, within TTL):

```bash
curl -i http://localhost:3000/get
# → X-Cache: HIT
```

3. **Clear cache**:

```bash
bun run dev --clear-cache
```

---

## Project Structure

```
src/
├── app.ts           # Hono app + proxy handler (with cache logic)
├── index.ts         # Server entry point (start, clear-cache)
├── config/
│   └── redis.ts     # Redis client + connection
└── service/
    └── db.ts        # Cache operations (get/set/clear)
```

---

## Roadmap.sh Context

This project implements the core ideas from [Roadmap.sh: Caching Server](https://roadmap.sh/projects/caching-server), focusing on:

- Reverse proxy behavior
- Redis-backed response caching
- Cache invalidation / clearing
- Observability via cache status headers

---

## License

MIT