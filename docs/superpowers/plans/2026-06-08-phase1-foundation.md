# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the database schema, Drizzle client, DSQL retry wrapper, and Auth.js v5 configuration so the project can write records to Aurora DSQL from a deployed Vercel environment.

**Architecture:** All schema is defined in a single `lib/db/schema.ts` using Drizzle ORM with `drizzle-orm/postgres-js`. Auth.js v5 (`auth.ts` at project root) handles magic-link auth via Resend, with sessions stored in Aurora DSQL using the Drizzle adapter. All write paths will use the `withDsqlRetry()` wrapper to handle DSQL's OCC serialization errors.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Drizzle ORM v0.45 · `postgres` driver · next-auth v5 beta · @auth/drizzle-adapter v1.x · Aurora DSQL (PostgreSQL-compatible, active-active multi-region) · Vercel KV

---

## ⚠️ DSQL Compatibility Flags (Aurora-specific rules, applied throughout)

1. **No enums** — Use `varchar` with table-level `check()` constraints instead.
2. **OCC is normal** — Every write transaction must use `withDsqlRetry()`. Error codes to catch: `40001`, `OC000`, `OC001`.
3. **`UNIQUE(pact_id)` on `executions`** — This is a database-level idempotency guarantee. Never bypass it.
4. **Partial index on `parties`** — `WHERE user_id IS NOT NULL` may have limited DSQL support. Included as specified in PRD; flag if migration fails.
5. **SSL required** — Aurora DSQL endpoints require TLS. The `postgres` driver must be configured with `ssl: 'require'`.

---

## ⚠️ Prerequisite: Upgrade next-auth v4 → v5

**Why:** The installed `next-auth@4.24.14` uses a fundamentally different API from v5. The PRD's `auth.ts` config — `export const { handlers, auth, signIn, signOut } = NextAuth(...)` — is a v5 pattern that does not exist in v4. The `@auth/core@0.34.3` already installed is v5's underlying engine; `next-auth@5` wraps it for Next.js.

- [ ] **Step P-1: Upgrade next-auth**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact
npm install next-auth@beta
```

- [ ] **Step P-2: Verify version**

```bash
node -e "console.log(require('./node_modules/next-auth/package.json').version)"
```

Expected output: `5.x.x-beta.xx` (any 5.x.x version)

- [ ] **Step P-3: Verify TypeScript baseline compiles**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors (the existing stub files have no auth imports yet)

- [ ] **Step P-4: Commit upgrade**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade next-auth v4 to v5 beta for Auth.js v5 API"
```

---

## Task 1: lib/db/schema.ts — Complete Drizzle Schema

**Files:**
- Create: `lib/db/schema.ts`

### What this file does

Defines all 11 tables using Drizzle ORM's `pgTable`. Tables are in dependency order (no forward references needed). Auth.js tables use TypeScript property names the `@auth/drizzle-adapter` expects (`name`, `image`, `emailVerified`, `sessionToken`, `userId`, `providerAccountId`) while the SQL column names match the PRD spec (`display_name`, `avatar_url`, `email_verified`, `session_token`, `user_id`, `provider_account_id`).

Status columns use `varchar` + table-level `check()` constraints — no PostgreSQL enums.

- [ ] **Step 1-1: Create lib/db/schema.ts**

```typescript
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ============================================================
// USERS
// TypeScript property names satisfy @auth/drizzle-adapter.
// SQL column names satisfy the PRD schema spec.
// ============================================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('display_name', { length: 100 }),        // TS: name (Auth.js) → SQL: display_name
  email: varchar('email', { length: 255 }).unique().notNull(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('avatar_url'),                              // TS: image (Auth.js) → SQL: avatar_url
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_users_email').on(t.email),
])

// ============================================================
// ACCOUNTS — Auth.js required table
// ============================================================
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  id_token: text('id_token'),
  session_state: varchar('session_state', { length: 255 }),
}, (t) => [
  uniqueIndex('accounts_provider_provider_account_id_key').on(t.provider, t.providerAccountId),
])

// ============================================================
// SESSIONS — Auth.js required table
// ============================================================
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: varchar('session_token', { length: 255 }).unique().notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
}, (t) => [
  index('idx_sessions_user_id').on(t.userId),
])

// ============================================================
// VERIFICATION TOKENS — Auth.js required table
// Note: Auth.js deletes these automatically after use.
// ============================================================
export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.identifier, t.token] }),
  uniqueIndex('verification_tokens_token_key').on(t.token),
])

// ============================================================
// PACTS — Core agreement record
// ============================================================
export const pacts = pgTable('pacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => users.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  outcomeStatement: text('outcome_statement').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('DRAFT'),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_pacts_creator_id').on(t.creatorId),
  index('idx_pacts_status').on(t.status),
  check(
    'pacts_status_check',
    sql`${t.status} IN ('DRAFT', 'PENDING_ACCEPTANCE', 'ACTIVE', 'EXECUTED', 'IN_DISPUTE', 'RESOLVED', 'VOID')`,
  ),
])

// ============================================================
// PARTIES — Participants in a Pact
// ============================================================
export const parties = pgTable('parties', {
  id: uuid('id').primaryKey().defaultRandom(),
  pactId: uuid('pact_id').notNull().references(() => pacts.id),
  userId: uuid('user_id').references(() => users.id),
  email: varchar('email', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 100 }),
  role: varchar('role', { length: 30 }).notNull().default('PARTICIPANT'),
  accepted: boolean('accepted').default(false),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  inviteToken: varchar('invite_token', { length: 128 }).unique().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_parties_pact_id').on(t.pactId),
  index('idx_parties_user_id').on(t.userId),
  index('idx_parties_email').on(t.email),
  index('idx_parties_invite_token').on(t.inviteToken),
  // Partial unique index: one user per pact, only when userId is set
  // NOTE: If Aurora DSQL rejects this partial index at migration time,
  // remove the .where() clause and enforce this constraint in application code.
  uniqueIndex('idx_parties_pact_user')
    .on(t.pactId, t.userId)
    .where(sql`${t.userId} IS NOT NULL`),
  check('parties_role_check', sql`${t.role} IN ('CREATOR', 'PARTICIPANT', 'ARBITRATOR')`),
])

// ============================================================
// CONDITIONS — Discrete obligations within a Pact
// ============================================================
export const conditions = pgTable('conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pactId: uuid('pact_id').notNull().references(() => pacts.id),
  assignedPartyId: uuid('assigned_party_id').notNull().references(() => parties.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  displayOrder: integer('display_order').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_conditions_pact_id').on(t.pactId),
  index('idx_conditions_assigned_party_id').on(t.assignedPartyId),
  index('idx_conditions_status').on(t.status),
  check('conditions_status_check', sql`${t.status} IN ('PENDING', 'FULFILLED')`),
])

// ============================================================
// CONDITION FULFILMENTS — Evidence record per fulfilled condition
// UNIQUE on condition_id: one fulfilment per condition, ever.
// ============================================================
export const conditionFulfilments = pgTable('condition_fulfilments', {
  id: uuid('id').primaryKey().defaultRandom(),
  conditionId: uuid('condition_id').notNull().references(() => conditions.id),
  partyId: uuid('party_id').notNull().references(() => parties.id),
  note: text('note'),
  referenceUrl: text('reference_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('idx_fulfilments_condition_id').on(t.conditionId),
])

// ============================================================
// AUDIT LOG — Immutable append-only event log with hash chain
// NEVER run UPDATE or DELETE against this table.
// ============================================================
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  pactId: uuid('pact_id').notNull().references(() => pacts.id),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  actorId: uuid('actor_id').references(() => users.id),
  actorLabel: varchar('actor_label', { length: 100 }),
  payload: jsonb('payload'),
  previousHash: varchar('previous_hash', { length: 64 }),
  entryHash: varchar('entry_hash', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_audit_log_pact_id').on(t.pactId),
  index('idx_audit_log_event_type').on(t.eventType),
  index('idx_audit_log_created_at').on(t.pactId, t.createdAt),
  check(
    'audit_log_event_type_check',
    sql`${t.eventType} IN ('PACT_CREATED', 'PACT_SUBMITTED', 'PARTY_INVITED', 'PARTY_ACCEPTED', 'PACT_ACTIVATED', 'CONDITION_FULFILLED', 'PACT_EXECUTED', 'DISPUTE_RAISED', 'DISPUTE_RESOLVED', 'VOID_PROPOSED', 'VOID_AGREED', 'PACT_VOIDED')`,
  ),
])

// ============================================================
// EXECUTIONS — One row per Pact, ever.
// UNIQUE(pact_id) is the database-level idempotency guarantee.
// A Pact can execute exactly once regardless of application code.
// ============================================================
export const executions = pgTable('executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pactId: uuid('pact_id').notNull().references(() => pacts.id),
  executedBy: uuid('executed_by').references(() => users.id),
  executionHash: varchar('execution_hash', { length: 64 }).notNull(),
  executionPayload: jsonb('execution_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('idx_executions_pact_id').on(t.pactId),
])

// ============================================================
// VOID PROPOSALS — Tracks per-party agreement to void a Pact
// ============================================================
export const voidProposals = pgTable('void_proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  pactId: uuid('pact_id').notNull().references(() => pacts.id),
  partyId: uuid('party_id').notNull().references(() => parties.id),
  agreedAt: timestamp('agreed_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('void_proposals_pact_id_party_id_key').on(t.pactId, t.partyId),
])

// ============================================================
// INFERRED TYPES — Use across the codebase instead of `any`
// ============================================================
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Pact = typeof pacts.$inferSelect
export type NewPact = typeof pacts.$inferInsert
export type Party = typeof parties.$inferSelect
export type NewParty = typeof parties.$inferInsert
export type Condition = typeof conditions.$inferSelect
export type NewCondition = typeof conditions.$inferInsert
export type ConditionFulfilment = typeof conditionFulfilments.$inferSelect
export type NewConditionFulfilment = typeof conditionFulfilments.$inferInsert
export type AuditLogEntry = typeof auditLog.$inferSelect
export type NewAuditLogEntry = typeof auditLog.$inferInsert
export type Execution = typeof executions.$inferSelect
export type NewExecution = typeof executions.$inferInsert
export type VoidProposal = typeof voidProposals.$inferSelect
export type NewVoidProposal = typeof voidProposals.$inferInsert

// Pact status values as a const for safe comparisons
export const PACT_STATUSES = [
  'DRAFT',
  'PENDING_ACCEPTANCE',
  'ACTIVE',
  'EXECUTED',
  'IN_DISPUTE',
  'RESOLVED',
  'VOID',
] as const
export type PactStatus = (typeof PACT_STATUSES)[number]

export const CONDITION_STATUSES = ['PENDING', 'FULFILLED'] as const
export type ConditionStatus = (typeof CONDITION_STATUSES)[number]

export const PARTY_ROLES = ['CREATOR', 'PARTICIPANT', 'ARBITRATOR'] as const
export type PartyRole = (typeof PARTY_ROLES)[number]

export const AUDIT_EVENT_TYPES = [
  'PACT_CREATED',
  'PACT_SUBMITTED',
  'PARTY_INVITED',
  'PARTY_ACCEPTED',
  'PACT_ACTIVATED',
  'CONDITION_FULFILLED',
  'PACT_EXECUTED',
  'DISPUTE_RAISED',
  'DISPUTE_RESOLVED',
  'VOID_PROPOSED',
  'VOID_AGREED',
  'PACT_VOIDED',
] as const
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number]
```

- [ ] **Step 1-2: Verify the schema compiles**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors. If you see `cannot find name 'check'`, add this to the import at the top of `schema.ts`:
```typescript
import { ..., check, ... } from 'drizzle-orm/pg-core'
```
The `check` export exists in `drizzle-orm/pg-core` from v0.30+.

- [ ] **Step 1-3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add complete Drizzle schema — 11 tables, all indexes, check constraints"
```

---

## Task 2: lib/db/index.ts — Drizzle Client

**Files:**
- Create: `lib/db/index.ts`

### What this file does

Creates and exports the single Drizzle `db` instance that all query helpers and API routes import. Uses the `postgres` driver (already installed) with SSL required for Aurora DSQL. Sets `max: 1` because Vercel serverless functions are stateless — one connection per function invocation is all that makes sense.

- [ ] **Step 2-1: Create lib/db/index.ts**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// max:1 — Vercel serverless: one connection per function instance.
// ssl:'require' — Aurora DSQL endpoints enforce TLS.
const client = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(client, { schema })
```

- [ ] **Step 2-2: Verify compiles**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2-3: Commit**

```bash
git add lib/db/index.ts
git commit -m "feat: add Drizzle client — postgres driver, SSL required, max:1 for serverless"
```

---

## Task 3: lib/dsql-retry.ts — DSQL OCC Retry Wrapper

**Files:**
- Create: `lib/dsql-retry.ts`

### What this file does

Aurora DSQL uses Optimistic Concurrency Control (OCC) and defers all conflict detection to commit time. Any write transaction — not just concurrent ones — can receive a serialization failure. This is by design, not an edge case. Every write transaction in the app must be wrapped in this helper.

Three error codes to catch:
- `40001` — PostgreSQL standard serialization failure
- `OC000` — DSQL-specific OCC row-level conflict
- `OC001` — DSQL-specific schema version conflict (stale catalog cache)

Backoff: 0ms, 50ms, 100ms (attempts 0, 1, 2).

- [ ] **Step 3-1: Create lib/dsql-retry.ts**

```typescript
const isDsqlConflict = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false
  const code = (error as Record<string, unknown>).code
  return code === '40001' || code === 'OC000' || code === 'OC001'
}

export async function withDsqlRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error: unknown) {
      if (isDsqlConflict(error) && attempt < maxAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 50 * Math.pow(2, attempt)),
        )
        continue
      }
      throw error
    }
  }
  throw new Error('DSQL transaction failed after max retries')
}
```

- [ ] **Step 3-2: Verify compiles**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 3-3: Commit**

```bash
git add lib/dsql-retry.ts
git commit -m "feat: add DSQL OCC retry wrapper — handles 40001, OC000, OC001 with exponential backoff"
```

---

## Task 4: auth.ts + middleware.ts — Auth.js v5 Configuration

**Files:**
- Create: `auth.ts` (project root)
- Create: `middleware.ts` (project root)
- Create: `app/api/auth/[...nextauth]/route.ts`

### What these files do

`auth.ts` is the single source of truth for authentication. It exports `{ handlers, auth, signIn, signOut }` from NextAuth with:
- Resend as the magic-link provider
- DrizzleAdapter storing sessions in Aurora DSQL (no external session store)
- Custom sign-in page at `/sign-in` (our design, not Auth.js default)
- Session callback that exposes `user.id` from the database on the session object

`middleware.ts` runs on every non-static request and redirects unauthenticated users to `/sign-in`. Public routes are explicitly allowlisted.

`app/api/auth/[...nextauth]/route.ts` mounts the Auth.js route handlers.

- [ ] **Step 4-1: Create auth.ts at project root**

```typescript
import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/lib/db'
import { accounts, sessions, users, verificationTokens } from '@/lib/db/schema'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: 'noreply@usepact.app',
    }),
  ],
  pages: {
    signIn: '/sign-in',
    verifyRequest: '/verify',
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})
```

- [ ] **Step 4-2: Create middleware.ts at project root**

```typescript
import { auth } from './auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/sign-in',
  '/verify',
]

const PUBLIC_PATTERNS = [
  /^\/pacts\/[^/]+\/accept$/,
  /^\/pacts\/[^/]+\/receipt$/,
  /^\/api\/auth\//,
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PATTERNS.some((pattern) => pattern.test(pathname))
}

export default auth((req: NextRequest & { auth: unknown }) => {
  if (!isPublic(req.nextUrl.pathname) && !req.auth) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 4-3: Create app/api/auth/[...nextauth]/route.ts**

```bash
mkdir -p /Users/olajideadeluwoye/Desktop/pact/pact/app/api/auth/\[...nextauth\]
```

File content for `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 4-4: Verify compiles**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

If you see type errors about `session.user.id`, add this to a file `types/next-auth.d.ts`:

```typescript
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
```

If you see a type error about `req.auth` in middleware.ts, adjust the middleware signature:

```typescript
export default auth((req) => {
  if (!isPublic(req.nextUrl.pathname) && !req.auth) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }
})
```

- [ ] **Step 4-5: Commit**

```bash
git add auth.ts middleware.ts app/api/auth
git commit -m "feat: add Auth.js v5 config — Resend magic link, DrizzleAdapter sessions in DSQL"
```

---

## Task 5: Generate Drizzle Migration

**Files:**
- Creates: `drizzle/migrations/` — migration SQL files generated from schema

### What this step does

`drizzle-kit generate` reads `lib/db/schema.ts` and generates SQL migration files in `drizzle/migrations/`. It does **not** connect to the database — generation is purely a file diff operation. The migration can be inspected before running it against the live DSQL instance.

Running `npm run db:migrate` (which connects to `DATABASE_URL`) is the deployment step and is not part of this plan — it happens in Phase 1 Gate verification when the DSQL instance is confirmed reachable.

- [ ] **Step 5-1: Generate the migration**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npm run db:generate
```

Expected output: Drizzle Kit generates SQL files in `drizzle/migrations/`. You will see output like:
```
No config path provided, using default 'drizzle.config.ts'
Reading config file '/Users/.../drizzle.config.ts'
11 tables
Generated 1 migration files
```

- [ ] **Step 5-2: Inspect the generated SQL**

```bash
cat /Users/olajideadeluwoye/Desktop/pact/pact/drizzle/migrations/*.sql | head -80
```

Verify:
- All 11 tables are present: `users`, `accounts`, `sessions`, `verification_tokens`, `pacts`, `parties`, `conditions`, `condition_fulfilments`, `audit_log`, `executions`, `void_proposals`
- No `CREATE TYPE` statements (no enums — DSQL compatible ✓)
- `UNIQUE(pact_id)` is present on `executions` table
- `CHECK` constraints are present on `pacts.status`, `parties.role`, `conditions.status`, `audit_log.event_type`

If the partial index (`WHERE user_id IS NOT NULL`) causes problems at migration time against DSQL, remove the `.where(...)` from the `idx_parties_pact_user` uniqueIndex definition in `schema.ts` and regenerate.

- [ ] **Step 5-3: Commit migration files**

```bash
git add drizzle/migrations/
git commit -m "feat: generate initial Drizzle migration — 11 tables, all indexes and constraints"
```

---

## Phase 1 Gate Verification

Before moving to Phase 2, confirm all of the following:

- [ ] `npx tsc --noEmit` exits with zero errors
- [ ] `npm run db:generate` produces a migration with all 11 tables and no `CREATE TYPE` statements
- [ ] The migration SQL contains `UNIQUE` on `executions.pact_id`
- [ ] The migration SQL contains `CHECK` constraints (not enums) on all status columns
- [ ] `auth.ts` exports `{ handlers, auth, signIn, signOut }` (v5 API confirmed)
- [ ] `middleware.ts` correctly uses `auth` as a wrapper and protects all non-public routes

**When you have `DATABASE_URL` set** (your Aurora DSQL connection string in `.env.local`), run:

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npm run db:migrate
```

Then verify with:

```bash
npm run db:studio
```

Open the Drizzle Studio URL in a browser and confirm all 11 tables exist with correct columns.

---

## Self-Review Checklist

| PRD Requirement | Covered By |
|---|---|
| All tables from §8 | Task 1 schema |
| `UNIQUE(pact_id)` on executions | Task 1: `uniqueIndex('idx_executions_pact_id').on(t.pactId)` |
| No enums — VARCHAR + CHECK | Task 1: all status columns use `varchar` + `check()` |
| Auth.js Drizzle adapter tables | Task 1: users, accounts, sessions, verificationTokens |
| DSQL OCC error codes 40001, OC000, OC001 | Task 3 |
| `withDsqlRetry` max 3 attempts, exponential backoff | Task 3 |
| auth.ts at root with `{ handlers, auth, signIn, signOut }` | Task 4 |
| Sessions in Aurora DSQL via DrizzleAdapter | Task 4 |
| Custom sign-in page at `/sign-in`, verify at `/verify` | Task 4 |
| Middleware protects all routes except public list | Task 4 |
| Public routes: `/`, `/sign-in`, `/verify`, `/pacts/*/accept`, `/pacts/*/receipt`, `/api/auth/*` | Task 4 |
| Initial Drizzle migration generated | Task 5 |
| `next-auth` v5 API (not v4) | Prerequisite |
