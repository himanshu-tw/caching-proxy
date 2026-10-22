# AGENTS.md

## Toolchain
- Runtime/build tool: **Bun** (`bun.lock`, no `package-lock.json`/`yarn.lock`). Use `bun` commands, never `npm`/`yarn`/`node` to run scripts.
- Single runtime dependency: `hono` (v4). One source file: `src/index.ts`, which exports the Hono `app` as the entry point.

## Commands
- Install deps: `bun install`
- Dev server (hot reload): `bun run dev` (runs `bun run --hot src/index.ts`)
- Type checking: `bun run --ts` (no `typecheck` script is defined; there is no lint/format/test script)
