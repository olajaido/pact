# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Multi-party commitment execution platform built for the AWS × Vercel H0 Hackathon (Track 2 B2B). Users create "pacts" — binding agreements with conditions — and all parties must digitally accept them. Conditions are tracked, and execution is atomic and audited.

**Stack:** Next.js 16 App Router · TypeScript strict · Aurora DSQL (PostgreSQL-compatible, active-active multi-region) · Drizzle ORM · Auth.js (@auth/core + next-auth) · Vercel KV (Redis pub/sub for SSE) · shadcn/ui dark theme · Tailwind CSS v4 · Zod · Resend (email)

> **Next.js 16 has breaking changes vs. prior versions.** Read `node_modules/next/dist/docs/` before writing any Next.js code.

## Current Build State

The project is a stub. Most directories exist but are empty. What's implemented:
- `app/page.tsx` — default Next.js placeholder (replace with landing page)
- `app/layout.tsx`, `app/globals.css` — base layout
- `components/ui/button.tsx` — first shadcn component
- `lib/utils.ts` — `cn()` helper

Everything else needs to be built. Build order: Foundation → Core Loop → Real-time → Polish (see PRD Phase order in `PACT_PRD_latest.md` §18).

## Commands

```bash
npm run dev          # local dev server (port 3000)
npm run build        # production build
npm run lint         # eslint
npm run db:generate  # generate Drizzle migration from schema changes
npm run db:migrate   # run pending migrations against DATABASE_URL
npm run db:push      # push schema directly (dev only)
npm run db:studio    # open Drizzle Studio (visual DB browser)
```

## Environment Variables

```
DATABASE_URL=          # Aurora DSQL connection string (postgres:// format)
AUTH_SECRET=           # random 32-char string: openssl rand -base64 32
AUTH_RESEND_KEY=       # Resend API key used by Auth.js for magic links
AUTH_URL=              # full deployed URL e.g. https://pact.vercel.app
RESEND_API_KEY=        # Resend API key for Pact notification emails
NEXT_PUBLIC_APP_URL=   # same as AUTH_URL, used client-side
KV_URL=                # auto-injected by Vercel KV
KV_REST_API_URL=       # auto-injected by Vercel KV
KV_REST_API_TOKEN=     # auto-injected by Vercel KV
```

## Directory Structure

```
app/
  (auth)/sign-in/     # magic link sign-in page
  (auth)/verify/      # "check your email" confirmation page
  api/auth/           # Auth.js route handler (GET + POST)
  api/pacts/          # pact CRUD, accept, submit, void, dispute, stream
  api/conditions/     # condition fulfilment APIs
  pacts/[id]/         # pact detail, accept, receipt pages
  pacts/new/          # create pact multi-step form
  dashboard/          # user dashboard

lib/
  db/schema.ts        # Drizzle schema — READ BEFORE ANY QUERY
  db/index.ts         # Drizzle client (postgres() + drizzle())
  db/queries/         # typed query helpers (pacts.ts, conditions.ts, audit.ts)
  email/templates/    # React Email templates (InviteEmail, FulfilledEmail, ExecutedEmail)
  dsql-retry.ts       # DSQL OCC retry wrapper (withDsqlRetry)
  execution.ts        # atomic pact execution transaction
  audit.ts            # audit log writer + hash chain
  sse.ts              # SSE event broadcaster via KV

components/
  ui/                 # shadcn/ui primitives
  forms/              # CreatePactForm, FulfilConditionModal
  pact/               # PactCard, PactStatusBadge, ConditionItem, AuditTimeline,
                      # PartyAvatar, ExecutionBanner

auth.ts               # Auth.js config (project root)
middleware.ts         # route protection (project root)
drizzle.config.ts     # schema: lib/db/schema.ts, out: drizzle/migrations/
```

## Database Schema

Tables: `pacts`, `parties`, `conditions`, `condition_fulfilments`, `executions` (UNIQUE on `pact_id`), `audit_log` (hash chain), `void_proposals`, `users`, `sessions`, `accounts`, `verification_tokens`

All PKs are UUIDs (`gen_random_uuid()`). Status fields use `VARCHAR` with check constraints — not enums (DSQL compatibility). See `PACT_PRD_latest.md` §8 for full DDL.

## Non-Negotiable Rules

- ALL write transactions must be wrapped in `withDsqlRetry()` from `lib/dsql-retry.ts` — Aurora DSQL uses optimistic concurrency control (OCC) and will return serialization errors that must be retried.
- `executions` has `UNIQUE(pact_id)` — one execution per pact ever. Never insert twice or bypass this constraint.
- SSE events are broadcast via `kv.publish()` (Vercel KV). Never use an in-memory Map as a fallback — Vercel functions are stateless and different requests land on different instances.
- Audit log is append-only — no UPDATE or DELETE on `audit_log` ever.
- Status transitions must follow the state machine below. No direct status overwrites.
- Never use `any` on database entities, query results, or API responses.
- Auth sessions live in Aurora DSQL via Drizzle adapter. No separate session store.
- SSE route handlers must set `export const runtime = 'nodejs'` — `kv.subscribe` requires Node.js runtime.

## State Machine

```
DRAFT → PENDING_ACCEPTANCE → ACTIVE → EXECUTED
ACTIVE → IN_DISPUTE → RESOLVED → EXECUTED or VOID
ACTIVE → VOID (requires unanimous void_proposals)
```

State transition triggers:
- `DRAFT → PENDING_ACCEPTANCE`: Creator submits
- `PENDING_ACCEPTANCE → ACTIVE`: All parties accepted (system, automatic)
- `ACTIVE → EXECUTED`: All conditions fulfilled (atomic DSQL transaction)
- `ACTIVE → VOID`: All parties agree via void_proposals

## Key Patterns

### Auth (every protected route)

```ts
import { auth } from '@/auth'
const session = await auth()
if (!session?.user?.id) return Response.json({ error: 'Unauthorised' }, { status: 401 })
```

### DSQL Retry Wrapper

OCC errors that must be retried: `40001` (serialization failure), `OC000` (DSQL row conflict), `OC001` (DSQL schema version conflict).

```ts
export async function withDsqlRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      const isConflict = error?.code === '40001' || error?.code === 'OC000' || error?.code === 'OC001'
      if (isConflict && attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)))
        continue
      }
      throw error
    }
  }
  throw new Error('DSQL transaction failed after max retries')
}
```

### Execution Transaction (exact order)

1. Check Pact is `ACTIVE`
2. Check no condition is still `PENDING`
3. `UPDATE pacts SET status = 'EXECUTED'` where `status = 'ACTIVE'` (guards race)
4. `INSERT INTO executions` (UNIQUE constraint is the idempotency guarantee)
5. `INSERT INTO audit_log`
6. Commit
7. **After commit** (outside transaction): `kv.publish()` SSE event + send emails

### SSE Broadcasting

```ts
// lib/sse.ts
import { kv } from '@vercel/kv'
export async function broadcastPactEvent(pactId: string, event: PactSSEEvent) {
  await kv.publish(`pact:${pactId}`, JSON.stringify(event))
}
```

SSE event types: `CONNECTED`, `PARTY_ACCEPTED`, `PACT_ACTIVATED`, `CONDITION_FULFILLED`, `PACT_EXECUTED`, `PACT_VOIDED`, `DISPUTE_RAISED`.

## API Routes

```
POST   /api/pacts                          # create (DRAFT), send invites
GET    /api/pacts                          # list user's pacts (?status=ACTIVE&page=1)
GET    /api/pacts/[id]                     # full detail: pact + parties + conditions + auditLog + currentParty
POST   /api/pacts/[id]/submit              # DRAFT → PENDING_ACCEPTANCE (creator only)
POST   /api/pacts/[id]/accept              # record party acceptance, activate if all accepted
POST   /api/pacts/[id]/void               # record void proposal, void if unanimous
POST   /api/pacts/[id]/dispute             # ACTIVE → IN_DISPUTE
POST   /api/pacts/[id]/resolve             # IN_DISPUTE → RESOLVED, then EXECUTED or VOID
GET    /api/pacts/[id]/stream              # SSE (runtime=nodejs, KV subscribe)
POST   /api/conditions/[id]/fulfil        # mark fulfilled, check execution readiness
```

`/api/pacts/[id]/accept` accepts an `inviteToken` body param — no session required (entry point for new users).

## Design System

Dark-first. No light mode. Visual identity: "Stripe meets Linear."

**Colours (CSS variables in `globals.css`):**
- Background: `#0C0C0E`
- Surface: `#141416`
- Border: `#242428`
- Text primary: `#F0EFE8`
- Accent (CTAs + execution moment only): `#D4FF4F`
- Fulfilled/executed: `#22C55E`
- Pending/in-dispute: `#F59E0B`
- Void: `#6B7280`
- Error: `#EF4444`

**Typography:**
- Headings: `DM Serif Display`
- Body: `IBM Plex Sans`
- Monospace (hashes, tokens): `JetBrains Mono`

**Motion:** Only one animation — the `PACT_EXECUTED` SSE event triggers an execution banner. All other transitions are 150ms ease-out max. No decorative animation.

**Component conventions:**
- Status badges: pill with icon + label
- Condition cards: left border colour strip indicating status
- Audit timeline: vertical line with event dots (not a table)
- Party avatars: coloured initials circle, colour deterministic from name hash

## Key Integrations

- **Aurora DSQL:** `DATABASE_URL`. Use `postgres()` driver. DSQL is active-active multi-region with OCC — this is why it was chosen: the execution transaction is simultaneously consistent across all regions.
- **Vercel KV:** `KV_URL` / `KV_REST_API_*`. Used exclusively for SSE pub/sub fan-out; not for session or application state.
- **Resend:** `RESEND_API_KEY`. Notification emails (invite, fulfilled, executed). `AUTH_RESEND_KEY` separately for Auth.js magic links.
- **Auth.js:** Magic-link provider only. `auth.ts` at project root exports `{ handlers, auth, signIn, signOut }`. DrizzleAdapter writes sessions to Aurora DSQL. Custom pages: `/sign-in` and `/verify`.
