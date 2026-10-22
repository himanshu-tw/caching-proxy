# AGENTS.md

## Toolchain
- Runtime/build tool: **Bun** (`bun.lock`, no `package-lock.json`/`yarn.lock`). Use `bun` commands, never `npm`/`yarn`/`node` to run scripts.
- Single runtime dependency: `hono` (v4).
- Source layout: `src/app.ts` exports the Hono `app`; `src/utils/flagParser.ts` parses CLI flags (`--port`, `--origin`, `--clear-cache`); `src/index.ts` is the server entry point.

## Commands
- Install deps: `bun install`
- Dev server (hot reload): `bun run dev` (runs `bun run --hot src/index.ts`)
