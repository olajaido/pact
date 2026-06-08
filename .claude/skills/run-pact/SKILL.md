---
name: run-pact
description: Build, run, start, and smoke-test the pact Next.js app. Use when asked to run pact, start the dev server, screenshot the UI, verify a route works, or confirm a change works in the running app.
---

Pact is a Next.js 16 App Router application (multi-party commitment execution platform). Drive it by starting the dev server and verifying routes with `curl`. Use `.claude/skills/run-pact/smoke.sh` as the primary agent harness.

## Prerequisites

No extra system packages needed — Node.js and npm are sufficient.

The app reads from `.env.local` at startup. If that file is absent, Next.js still starts and serves the home page. Routes that touch the database (`DATABASE_URL`) or auth (`AUTH_SECRET`, `AUTH_RESEND_KEY`) will error at request time, not at startup.

```bash
# Required env vars for full functionality (not needed for smoke tests):
# DATABASE_URL       — Aurora DSQL connection string
# AUTH_SECRET        — Auth.js secret
# AUTH_RESEND_KEY    — Resend API key for magic-link emails
# KV_URL / KV_REST_API_* — Vercel KV for SSE pub/sub
# RESEND_API_KEY     — Resend API key
```

## Setup

```bash
npm install
```

## Run (agent path)

Start the server and run smoke tests in one command:

```bash
bash .claude/skills/run-pact/smoke.sh
```

This script:
1. Starts `npm run dev` in the background on port 3000 if not already running (logs to `/tmp/pact-dev.log`, PID to `/tmp/pact.pid`).
2. Polls until the server is ready (up to 60 s).
3. Runs `curl`-based checks on known routes and prints PASS/FAIL per route.

To check a specific route after the server is up:

```bash
# HTTP status check
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

# Body content check
curl -sf http://localhost:3000/ | grep "To get started"
```

To stop the server:

```bash
pkill -f "next dev"
```

Server logs: `/tmp/pact-dev.log`

## Run (human path)

```bash
npm run dev   # → http://localhost:3000. Stop with Ctrl-C.
```

## Test

```bash
npm run lint
npm run build   # type-check + production build
```

`npm run build` is the most thorough static check — it catches TypeScript errors and missing env var imports that lint alone misses.

## Gotchas

- **Routes not yet implemented return 404** — `dashboard`, `pacts/[id]`, `pacts/new`, sign-in, and all API routes are stubs. This is expected; the smoke script explicitly asserts 404 for stub routes so failures are visible as they get built out.
- **`chromium-cli` is not available on this macOS host** — use `curl` for all headless verification. If you need a real browser interaction (e.g. to test a React component), run the dev server and open it manually, or add Playwright (`npm install -D @playwright/test`) and wire up `npx playwright test`.
- **First request can take 3 s** — Turbopack compiles on first load. The smoke script polls for readiness before running checks, so this is handled automatically.
- **`.env.local` absence is silent** — Next.js logs "Environments: .env.local" at startup even when the file doesn't exist. Missing vars surface as runtime errors (e.g. `DATABASE_URL is not defined`) only when the relevant route is hit.
- **Aurora DSQL OCC retries** — all write transactions must be wrapped in `withDsqlRetry()` from `lib/dsql-retry.ts`. Skipping this causes intermittent serialization failures in production.

## Troubleshooting

- **`EADDRINUSE :3000`**: another Next.js process is running. `pkill -f "next dev"` then retry.
- **`Error: Cannot find module 'postgres'`**: run `npm install` — node_modules is missing.
- **`Error: DATABASE_URL is not defined`**: add the env var to `.env.local`. The smoke test does not require it (only hits the home page).
- **Build fails with `Module not found`**: a stub import references a file not yet created. Check `lib/db/schema.ts` and `lib/dsql-retry.ts` exist — they are listed in CLAUDE.md as required by the schema but may not be scaffolded yet.
