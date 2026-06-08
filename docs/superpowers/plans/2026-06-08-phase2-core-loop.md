# Phase 2 — Core Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Pact creation → party acceptance → condition fulfilment → atomic execution path so the Phase 2 gate can be verified end-to-end against Aurora DSQL.

**Architecture:** All business logic lives in `lib/db/queries/` (query helpers) and `lib/` (domain logic). API routes are thin wrappers that call those helpers. The pact detail page is a Next.js Server Component; the "Mark as Fulfilled" button is the only Client Component needed for Phase 2. Every write uses `withDsqlRetry`. Emails and SSE are deferred to Phase 3 — Phase 2 ends the moment `executions` gets its row.

**Tech Stack:** Next.js 16 App Router · Drizzle ORM 0.45 · postgres driver · next-auth v5 · Zod 4 · Node crypto (hash chain)

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `lib/errors.ts` | **Create** | `AppError` class with HTTP status code — used by all API routes |
| `lib/audit.ts` | **Create** | `computeHash`, `writeAuditEntry` (standalone), `writeAuditInTx` (inside tx) |
| `lib/db/index.ts` | **Modify** | Add `DbTransaction` type export |
| `lib/db/queries/pacts.ts` | **Create** | `createPact`, `submitPact`, `getPactById`, `listPactsForUser`, `acceptParty` |
| `lib/db/queries/conditions.ts` | **Create** | `fulfilConditionByParty` |
| `lib/execution.ts` | **Create** | `attemptPactExecution` — the atomic ACID transaction |
| `app/api/pacts/route.ts` | **Create** | `POST /api/pacts` (create) · `GET /api/pacts` (list) |
| `app/api/pacts/[id]/route.ts` | **Create** | `GET /api/pacts/[id]` (full detail) |
| `app/api/pacts/[id]/submit/route.ts` | **Create** | `POST /api/pacts/[id]/submit` DRAFT → PENDING_ACCEPTANCE |
| `app/api/pacts/[id]/accept/route.ts` | **Create** | `POST /api/pacts/[id]/accept` party acceptance |
| `app/api/conditions/[id]/fulfil/route.ts` | **Create** | `POST /api/conditions/[id]/fulfil` |
| `app/pacts/[id]/page.tsx` | **Create** | Static Server Component pact detail view |
| `app/pacts/[id]/accept/page.tsx` | **Create** | Acceptance UI with Server Action |
| `components/pact/FulfilButton.tsx` | **Create** | Client Component — calls fulfil API, reloads page |

---

## ⚠️ Checkpoint Protocol

The user requested a checkpoint after every task. After each task's commit step, **stop and wait for approval** before starting the next task. State clearly: "**Task N complete. Ready for Task N+1?**"

---

## Task 7: Create Pact API (POST /api/pacts + submit)

**Files:**
- Create: `lib/errors.ts`
- Create: `lib/audit.ts`
- Modify: `lib/db/index.ts` (add `DbTransaction` type)
- Create: `lib/db/queries/pacts.ts` (`createPact`, `submitPact`)
- Create: `app/api/pacts/route.ts`
- Create: `app/api/pacts/[id]/submit/route.ts`

---

- [ ] **Step 7-1: Create lib/errors.ts**

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
```

---

- [ ] **Step 7-2: Create lib/audit.ts**

`writeAuditEntry` uses `db` directly (standalone writes, outside transactions).
`writeAuditInTx` accepts the transaction object (inside transactions).
Both call the private `writeAuditWith` that accepts a structural type covering both.

```typescript
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import type { DbTransaction } from '@/lib/db'
import { auditLog } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import type { AuditEventType } from '@/lib/db/schema'

// Structural type: both `db` and transaction `tx` satisfy this
type QueryRunner = Pick<typeof db, 'insert' | 'select'>

export interface AuditEntryOptions {
  pactId: string
  eventType: AuditEventType
  actorId?: string | null
  actorLabel?: string | null
  payload?: Record<string, unknown>
}

export function computeHash(data: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
}

async function writeAuditWith(
  runner: QueryRunner,
  options: AuditEntryOptions,
): Promise<void> {
  const {
    pactId,
    eventType,
    actorId = null,
    actorLabel = null,
    payload = null,
  } = options

  const [previous] = await runner
    .select({ entryHash: auditLog.entryHash })
    .from(auditLog)
    .where(eq(auditLog.pactId, pactId))
    .orderBy(desc(auditLog.createdAt))
    .limit(1)

  const previousHash = previous?.entryHash ?? 'GENESIS'

  const entryHash = computeHash({
    pactId,
    eventType,
    actorId,
    actorLabel,
    payload,
    previousHash,
  })

  await runner.insert(auditLog).values({
    pactId,
    eventType,
    actorId,
    actorLabel,
    payload: payload ?? undefined,
    previousHash,
    entryHash,
  })
}

/** Standalone audit write — use outside of transactions */
export async function writeAuditEntry(options: AuditEntryOptions): Promise<void> {
  await writeAuditWith(db, options)
}

/** Transaction-scoped audit write — use inside db.transaction() callbacks */
export async function writeAuditInTx(
  tx: DbTransaction,
  options: AuditEntryOptions,
): Promise<void> {
  await writeAuditWith(tx as unknown as QueryRunner, options)
}
```

---

- [ ] **Step 7-3: Add DbTransaction type to lib/db/index.ts**

Read the current file first, then add the type export at the bottom.

Current `lib/db/index.ts` ends at line 19. Append these imports and export:

```typescript
import type { PostgresJsTransaction } from 'drizzle-orm/postgres-js'
import type { ExtractTablesWithRelations } from 'drizzle-orm'

export type DbTransaction = PostgresJsTransaction<
  ExtractTablesWithRelations<typeof schema>,
  ExtractTablesWithRelations<typeof schema>
>
```

The final `lib/db/index.ts` becomes:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import type { PostgresJsTransaction } from 'drizzle-orm/postgres-js'
import type { ExtractTablesWithRelations } from 'drizzle-orm'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// max:1 — Vercel serverless: one connection per function instance.
// ssl:'verify-full' — verifies the server certificate against the system trust store
// (which includes AWS CA certs on Vercel). Prevents MITM against Aurora DSQL.
const client = postgres(process.env.DATABASE_URL, {
  ssl: 'verify-full',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(client, { schema })

export type DbTransaction = PostgresJsTransaction<
  ExtractTablesWithRelations<typeof schema>,
  ExtractTablesWithRelations<typeof schema>
>
```

---

- [ ] **Step 7-4: Create lib/db/queries/pacts.ts (createPact + submitPact)**

```typescript
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import type { DbTransaction } from '@/lib/db'
import {
  pacts,
  parties,
  conditions,
  auditLog,
} from '@/lib/db/schema'
import { eq, and, desc, asc, sql } from 'drizzle-orm'
import { withDsqlRetry } from '@/lib/dsql-retry'
import { writeAuditInTx, computeHash } from '@/lib/audit'
import { AppError } from '@/lib/errors'
import type { Pact, Party, Condition, AuditLogEntry } from '@/lib/db/schema'

// ─── Types ───────────────────────────────────────────────────

export interface CreatePactInput {
  title: string
  description?: string
  outcomeStatement: string
  /** All parties including creator. Creator identified by matching creatorEmail. */
  parties: Array<{
    email: string
    name: string
    conditions: Array<{ title: string; description?: string }>
  }>
  creatorId: string
  creatorEmail: string
  creatorName: string | null
}

export interface PactDetail {
  pact: Pact
  parties: Party[]
  conditions: Condition[]
  auditLog: AuditLogEntry[]
  currentParty: Party | null
}

// ─── createPact ──────────────────────────────────────────────

export async function createPact(input: CreatePactInput) {
  return withDsqlRetry(() =>
    db.transaction(async (tx) => {
      // Insert pact in DRAFT
      const [pact] = await tx
        .insert(pacts)
        .values({
          creatorId: input.creatorId,
          title: input.title,
          description: input.description,
          outcomeStatement: input.outcomeStatement,
          status: 'DRAFT',
        })
        .returning()

      // Insert all parties; mark creator's entry
      const partyValues = input.parties.map((p) => ({
        pactId: pact.id,
        email: p.email.toLowerCase(),
        displayName: p.name,
        role:
          p.email.toLowerCase() === input.creatorEmail.toLowerCase()
            ? ('CREATOR' as const)
            : ('PARTICIPANT' as const),
        accepted:
          p.email.toLowerCase() === input.creatorEmail.toLowerCase(),
        acceptedAt:
          p.email.toLowerCase() === input.creatorEmail.toLowerCase()
            ? new Date()
            : null,
        userId:
          p.email.toLowerCase() === input.creatorEmail.toLowerCase()
            ? input.creatorId
            : null,
        inviteToken: crypto.randomUUID(),
      }))

      const insertedParties = await tx
        .insert(parties)
        .values(partyValues)
        .returning()

      // Map email → party record
      const emailToParty = new Map(
        insertedParties.map((p) => [p.email.toLowerCase(), p]),
      )

      // Insert conditions in display order
      let order = 0
      for (const partyInput of input.parties) {
        const party = emailToParty.get(partyInput.email.toLowerCase())
        if (!party) continue
        for (const cond of partyInput.conditions) {
          await tx.insert(conditions).values({
            pactId: pact.id,
            assignedPartyId: party.id,
            title: cond.title,
            description: cond.description,
            displayOrder: order++,
          })
        }
      }

      // Audit: PACT_CREATED
      await writeAuditInTx(tx, {
        pactId: pact.id,
        eventType: 'PACT_CREATED',
        actorId: input.creatorId,
        actorLabel: input.creatorName,
        payload: { title: pact.title },
      })

      // Audit: PARTY_INVITED for each counterparty
      for (const p of insertedParties) {
        if (p.role === 'PARTICIPANT') {
          await writeAuditInTx(tx, {
            pactId: pact.id,
            eventType: 'PARTY_INVITED',
            actorId: input.creatorId,
            actorLabel: input.creatorName,
            payload: { invitedEmail: p.email, inviteToken: p.inviteToken },
          })
        }
      }

      return { pact, parties: insertedParties }
    }),
  )
}

// ─── submitPact ──────────────────────────────────────────────

export async function submitPact(pactId: string, userId: string, userName: string | null) {
  return withDsqlRetry(() =>
    db.transaction(async (tx) => {
      const [pact] = await tx
        .select()
        .from(pacts)
        .where(eq(pacts.id, pactId))
        .limit(1)

      if (!pact) throw new AppError('Pact not found', 404)
      if (pact.creatorId !== userId) throw new AppError('Forbidden', 403)
      if (pact.status !== 'DRAFT') throw new AppError('Pact is not in DRAFT status', 400)

      const [updated] = await tx
        .update(pacts)
        .set({ status: 'PENDING_ACCEPTANCE', updatedAt: new Date() })
        .where(eq(pacts.id, pactId))
        .returning()

      await writeAuditInTx(tx, {
        pactId,
        eventType: 'PACT_SUBMITTED',
        actorId: userId,
        actorLabel: userName,
        payload: {},
      })

      return updated
    }),
  )
}
```

---

- [ ] **Step 7-5: Create app/api/pacts/route.ts**

```bash
mkdir -p /Users/olajideadeluwoye/Desktop/pact/pact/app/api/pacts
```

```typescript
import { auth } from '@/auth'
import { createPact } from '@/lib/db/queries/pacts'
import { AppError } from '@/lib/errors'
import { db } from '@/lib/db'
import { pacts, parties } from '@/lib/db/schema'
import { desc, eq, and } from 'drizzle-orm'
import { z } from 'zod'

const createPactBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  outcomeStatement: z.string().min(1),
  parties: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).max(100),
        conditions: z.array(
          z.object({
            title: z.string().min(1).max(200),
            description: z.string().optional(),
          }),
        ),
      }),
    )
    .min(2)
    .max(5),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const parsed = createPactBody.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  const body = parsed.data

  // Creator must be in the parties list
  const creatorInParties = body.parties.some(
    (p) => p.email.toLowerCase() === session.user.email!.toLowerCase(),
  )
  if (!creatorInParties) {
    return Response.json(
      { error: 'Creator email must be included in the parties list' },
      { status: 400 },
    )
  }

  try {
    const result = await createPact({
      title: body.title,
      description: body.description,
      outcomeStatement: body.outcomeStatement,
      parties: body.parties,
      creatorId: session.user.id,
      creatorEmail: session.user.email!,
      creatorName: session.user.name ?? null,
    })
    return Response.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/pacts error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const rows = await db
    .select({ pact: pacts })
    .from(pacts)
    .innerJoin(
      parties,
      and(eq(parties.pactId, pacts.id), eq(parties.userId, session.user.id)),
    )
    .where(status ? eq(pacts.status, status) : undefined)
    .orderBy(desc(pacts.updatedAt))

  return Response.json({ pacts: rows.map((r) => r.pact) })
}
```

---

- [ ] **Step 7-6: Create app/api/pacts/[id]/submit/route.ts**

```bash
mkdir -p "/Users/olajideadeluwoye/Desktop/pact/pact/app/api/pacts/[id]/submit"
```

```typescript
import { auth } from '@/auth'
import { submitPact } from '@/lib/db/queries/pacts'
import { AppError } from '@/lib/errors'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id: pactId } = await params

  try {
    const pact = await submitPact(pactId, session.user.id, session.user.name ?? null)
    return Response.json({ pact })
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/pacts/[id]/submit error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

- [ ] **Step 7-7: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

**Common failure:** If `writeAuditWith` fails on the `Pick<typeof db, 'insert' | 'select'>` cast, replace `tx as unknown as QueryRunner` with `tx as unknown as typeof db` in `lib/audit.ts`. Both casts are safe.

---

- [ ] **Step 7-8: Commit**

```bash
git add lib/errors.ts lib/audit.ts lib/db/index.ts lib/db/queries/pacts.ts \
  app/api/pacts/route.ts "app/api/pacts/[id]/submit/route.ts" && \
git commit -m "feat: Task 7 — POST /api/pacts create + submit, audit hash chain"
```

---

**⏸ CHECKPOINT 7 — Stop here. Confirm Task 7 is working before proceeding.**

Manual smoke test (requires DATABASE_URL in .env.local and running server):

```bash
npm run dev
```

```bash
# Create a pact (replace emails with your real test emails)
curl -s -X POST http://localhost:3000/api/pacts \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <your-session-cookie>' \
  -d '{
    "title": "Test Pact",
    "outcomeStatement": "Both parties confirm done",
    "parties": [
      {"email": "you@example.com", "name": "You", "conditions": [{"title": "Your condition"}]},
      {"email": "other@example.com", "name": "Other", "conditions": [{"title": "Their condition"}]}
    ]
  }' | jq .
```

Expected: `201` with `{ pact: { id: "...", status: "DRAFT", ... }, parties: [...] }`

```bash
# Submit the pact (use the id from above)
curl -s -X POST http://localhost:3000/api/pacts/<PACT_ID>/submit \
  -H 'Cookie: <session-cookie>' | jq .
```

Expected: `{ pact: { status: "PENDING_ACCEPTANCE", ... } }`

---

## Task 8: Pact Detail Page (GET /api/pacts/[id] + static UI)

**Files:**
- Modify: `lib/db/queries/pacts.ts` — add `getPactById`, `listPactsForUser`
- Create: `app/api/pacts/[id]/route.ts`
- Create: `app/pacts/[id]/page.tsx`
- Create: `components/pact/FulfilButton.tsx`

---

- [ ] **Step 8-1: Add getPactById and listPactsForUser to lib/db/queries/pacts.ts**

Append these functions to the existing `lib/db/queries/pacts.ts` (after `submitPact`):

```typescript
// ─── getPactById ─────────────────────────────────────────────

export async function getPactById(
  pactId: string,
  userId: string | null,
): Promise<PactDetail | null> {
  const [pact] = await db
    .select()
    .from(pacts)
    .where(eq(pacts.id, pactId))
    .limit(1)

  if (!pact) return null

  const [partyList, conditionList, auditEntries] = await Promise.all([
    db
      .select()
      .from(parties)
      .where(eq(parties.pactId, pactId))
      .orderBy(asc(parties.createdAt)),
    db
      .select()
      .from(conditions)
      .where(eq(conditions.pactId, pactId))
      .orderBy(asc(conditions.displayOrder)),
    db
      .select()
      .from(auditLog)
      .where(eq(auditLog.pactId, pactId))
      .orderBy(asc(auditLog.createdAt)),
  ])

  const currentParty = userId
    ? (partyList.find((p) => p.userId === userId) ?? null)
    : null

  return {
    pact,
    parties: partyList,
    conditions: conditionList,
    auditLog: auditEntries,
    currentParty,
  }
}

// ─── listPactsForUser ────────────────────────────────────────

export async function listPactsForUser(userId: string, status?: string) {
  const rows = await db
    .select({ pact: pacts })
    .from(pacts)
    .innerJoin(
      parties,
      and(eq(parties.pactId, pacts.id), eq(parties.userId, userId)),
    )
    .where(status ? eq(pacts.status, status) : undefined)
    .orderBy(desc(pacts.updatedAt))

  return rows.map((r) => r.pact)
}
```

---

- [ ] **Step 8-2: Create app/api/pacts/[id]/route.ts**

```bash
mkdir -p "/Users/olajideadeluwoye/Desktop/pact/pact/app/api/pacts/[id]"
```

```typescript
import { auth } from '@/auth'
import { getPactById } from '@/lib/db/queries/pacts'
import { AppError } from '@/lib/errors'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id: pactId } = await params

  try {
    const detail = await getPactById(pactId, session.user.id)
    if (!detail) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    // Only parties can view a pact detail
    if (!detail.currentParty) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    return Response.json(detail)
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('GET /api/pacts/[id] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

- [ ] **Step 8-3: Create components/pact/FulfilButton.tsx**

Client Component — calls the fulfil API then reloads the page. In Phase 3 this reload will be replaced by SSE-driven state update.

```bash
mkdir -p /Users/olajideadeluwoye/Desktop/pact/pact/components/pact
```

```tsx
'use client'

import { useState } from 'react'

interface FulfilButtonProps {
  conditionId: string
  pactId: string
}

export function FulfilButton({ conditionId, pactId }: FulfilButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/conditions/${conditionId}/fulfil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Failed to fulfil condition')
        return
      }
      // Phase 2: simple reload. Phase 3 will use SSE instead.
      window.location.reload()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          background: '#D4FF4F',
          color: '#0C0C0E',
          padding: '8px 16px',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Marking…' : 'Mark as Fulfilled'}
      </button>
      {error && <p style={{ color: '#EF4444', marginTop: 4 }}>{error}</p>}
    </div>
  )
}
```

---

- [ ] **Step 8-4: Create app/pacts/[id]/page.tsx**

```bash
mkdir -p "/Users/olajideadeluwoye/Desktop/pact/pact/app/pacts/[id]"
```

```tsx
import { auth } from '@/auth'
import { getPactById } from '@/lib/db/queries/pacts'
import { notFound, redirect } from 'next/navigation'
import { FulfilButton } from '@/components/pact/FulfilButton'

export default async function PactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')

  const { id } = await params
  const data = await getPactById(id, session.user.id)

  if (!data) notFound()
  if (!data.currentParty) {
    return (
      <main style={{ padding: 32, fontFamily: 'IBM Plex Sans, sans-serif', color: '#F0EFE8', background: '#0C0C0E', minHeight: '100vh' }}>
        <p>You are not a party to this Pact.</p>
      </main>
    )
  }

  const { pact, parties, conditions, auditLog, currentParty } = data

  // Build a map for quick party lookup
  const partyMap = new Map(parties.map((p) => [p.id, p]))

  return (
    <main
      style={{
        padding: 32,
        fontFamily: 'IBM Plex Sans, sans-serif',
        color: '#F0EFE8',
        background: '#0C0C0E',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 32, margin: 0 }}>
          {pact.title}
        </h1>
        <span
          style={{
            display: 'inline-block',
            marginTop: 8,
            padding: '4px 12px',
            borderRadius: 999,
            background:
              pact.status === 'EXECUTED'
                ? '#22C55E'
                : pact.status === 'ACTIVE'
                  ? '#D4FF4F'
                  : pact.status === 'IN_DISPUTE'
                    ? '#F59E0B'
                    : '#6B7280',
            color: '#0C0C0E',
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {pact.status}
        </span>
      </div>

      {/* Outcome */}
      {pact.outcomeStatement && (
        <div
          style={{
            background: '#141416',
            border: '1px solid #242428',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <strong>Outcome:</strong> {pact.outcomeStatement}
        </div>
      )}

      {/* Parties */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Parties</h2>
        {parties.map((party) => (
          <div
            key={party.id}
            style={{
              background: '#141416',
              border: '1px solid #242428',
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong>{party.displayName ?? party.email}</strong>
              <span style={{ color: '#6B7280', marginLeft: 8, fontSize: 13 }}>
                {party.role}
              </span>
            </div>
            <span
              style={{
                color: party.accepted ? '#22C55E' : '#F59E0B',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {party.accepted ? 'Accepted' : 'Pending acceptance'}
            </span>
          </div>
        ))}
      </section>

      {/* Conditions */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Conditions</h2>
        {conditions.map((condition) => {
          const assignedParty = partyMap.get(condition.assignedPartyId)
          const isAssignedToMe = condition.assignedPartyId === currentParty.id
          const canFulfil = isAssignedToMe && condition.status === 'PENDING' && pact.status === 'ACTIVE'

          return (
            <div
              key={condition.id}
              style={{
                background: '#141416',
                borderLeft: `4px solid ${condition.status === 'FULFILLED' ? '#22C55E' : '#242428'}`,
                borderRadius: 8,
                padding: 16,
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong>{condition.title}</strong>
                  {condition.description && (
                    <p style={{ color: '#6B7280', fontSize: 13, margin: '4px 0 0' }}>
                      {condition.description}
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '6px 0 0' }}>
                    Assigned to: {assignedParty?.displayName ?? assignedParty?.email ?? 'Unknown'}
                  </p>
                </div>
                <span
                  style={{
                    color: condition.status === 'FULFILLED' ? '#22C55E' : '#F59E0B',
                    fontWeight: 600,
                    fontSize: 13,
                    marginLeft: 12,
                    flexShrink: 0,
                  }}
                >
                  {condition.status}
                </span>
              </div>
              {canFulfil && (
                <div style={{ marginTop: 12 }}>
                  <FulfilButton conditionId={condition.id} pactId={id} />
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* Audit Log */}
      <section>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Audit Trail</h2>
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          {auditLog.map((entry, i) => (
            <div
              key={entry.id}
              style={{
                position: 'relative',
                paddingBottom: i < auditLog.length - 1 ? 20 : 0,
              }}
            >
              {/* Timeline dot */}
              <div
                style={{
                  position: 'absolute',
                  left: -20,
                  top: 4,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#D4FF4F',
                }}
              />
              {/* Timeline line */}
              {i < auditLog.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: -17,
                    top: 12,
                    width: 2,
                    height: '100%',
                    background: '#242428',
                  }}
                />
              )}
              <div>
                <strong style={{ fontSize: 13 }}>{entry.eventType}</strong>
                <span style={{ color: '#6B7280', fontSize: 12, marginLeft: 8 }}>
                  {entry.actorLabel ?? 'system'}
                </span>
                <p style={{ color: '#6B7280', fontSize: 12, margin: '2px 0 0' }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
```

---

- [ ] **Step 8-5: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

- [ ] **Step 8-6: Commit**

```bash
git add "lib/db/queries/pacts.ts" "app/api/pacts/[id]/route.ts" \
  "app/pacts/[id]/page.tsx" "components/pact/FulfilButton.tsx" && \
git commit -m "feat: Task 8 — pact detail API + static Server Component page"
```

---

**⏸ CHECKPOINT 8 — Stop here.**

Verify: `GET /api/pacts/<PACT_ID>` returns `{ pact, parties, conditions, auditLog, currentParty }`.
Verify: navigating to `http://localhost:3000/pacts/<PACT_ID>` in a browser renders the detail page with parties and conditions.

---

## Task 9: Party Acceptance Flow

**Files:**
- Modify: `lib/db/queries/pacts.ts` — add `acceptParty`
- Create: `app/api/pacts/[id]/accept/route.ts`
- Create: `app/pacts/[id]/accept/page.tsx`

---

- [ ] **Step 9-1: Add acceptParty to lib/db/queries/pacts.ts**

Append to `lib/db/queries/pacts.ts` after `listPactsForUser`:

```typescript
// ─── acceptParty ─────────────────────────────────────────────

export async function acceptParty(inviteToken: string, userId: string, userName: string | null) {
  return withDsqlRetry(() =>
    db.transaction(async (tx) => {
      // Find party by invite token
      const [party] = await tx
        .select()
        .from(parties)
        .where(eq(parties.inviteToken, inviteToken))
        .limit(1)

      if (!party) throw new AppError('Invalid invite token', 404)
      if (party.accepted) throw new AppError('Already accepted', 400)

      // Check pact status
      const [pact] = await tx
        .select()
        .from(pacts)
        .where(eq(pacts.id, party.pactId))
        .limit(1)

      if (!pact) throw new AppError('Pact not found', 404)
      if (pact.status !== 'PENDING_ACCEPTANCE') {
        throw new AppError('Pact is not accepting parties right now', 400)
      }

      // Accept the party
      await tx
        .update(parties)
        .set({ accepted: true, userId, acceptedAt: new Date() })
        .where(eq(parties.id, party.id))

      await writeAuditInTx(tx, {
        pactId: pact.id,
        eventType: 'PARTY_ACCEPTED',
        actorId: userId,
        actorLabel: userName,
        payload: { partyId: party.id, email: party.email },
      })

      // Check if all parties have accepted
      const [{ pendingCount }] = await tx
        .select({ pendingCount: sql<number>`count(*)::int` })
        .from(parties)
        .where(and(eq(parties.pactId, pact.id), eq(parties.accepted, false)))

      if (pendingCount === 0) {
        await tx
          .update(pacts)
          .set({ status: 'ACTIVE', updatedAt: new Date() })
          .where(eq(pacts.id, pact.id))

        await writeAuditInTx(tx, {
          pactId: pact.id,
          eventType: 'PACT_ACTIVATED',
          actorId: null,
          actorLabel: 'system',
          payload: { activatedAt: new Date().toISOString() },
        })

        return { party, pactId: pact.id, pactStatus: 'ACTIVE' as const }
      }

      return { party, pactId: pact.id, pactStatus: 'PENDING_ACCEPTANCE' as const }
    }),
  )
}
```

---

- [ ] **Step 9-2: Create app/api/pacts/[id]/accept/route.ts**

```bash
mkdir -p "/Users/olajideadeluwoye/Desktop/pact/pact/app/api/pacts/[id]/accept"
```

```typescript
import { auth } from '@/auth'
import { acceptParty } from '@/lib/db/queries/pacts'
import { AppError } from '@/lib/errors'
import { z } from 'zod'

const acceptBody = z.object({
  inviteToken: z.string().min(1),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const parsed = acceptBody.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  try {
    const result = await acceptParty(
      parsed.data.inviteToken,
      session.user.id,
      session.user.name ?? null,
    )
    return Response.json(result)
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/pacts/[id]/accept error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

- [ ] **Step 9-3: Create app/pacts/[id]/accept/page.tsx**

```bash
mkdir -p "/Users/olajideadeluwoye/Desktop/pact/pact/app/pacts/[id]/accept"
```

```tsx
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { parties, pacts } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { acceptParty } from '@/lib/db/queries/pacts'
import { AppError } from '@/lib/errors'

export default async function AcceptPactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { id } = await params
  const { token } = await searchParams

  if (!token) {
    return (
      <main style={{ padding: 32, fontFamily: 'IBM Plex Sans, sans-serif', color: '#F0EFE8', background: '#0C0C0E', minHeight: '100vh' }}>
        <p>Invalid invite link — missing token.</p>
      </main>
    )
  }

  // Look up party by token (no auth required for viewing)
  const [party] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.inviteToken, token), eq(parties.pactId, id)))
    .limit(1)

  if (!party) {
    return (
      <main style={{ padding: 32, fontFamily: 'IBM Plex Sans, sans-serif', color: '#F0EFE8', background: '#0C0C0E', minHeight: '100vh' }}>
        <p>Invite link is invalid or has expired.</p>
      </main>
    )
  }

  const [pact] = await db.select().from(pacts).where(eq(pacts.id, id)).limit(1)

  if (!pact) {
    return (
      <main style={{ padding: 32, fontFamily: 'IBM Plex Sans, sans-serif', color: '#F0EFE8', background: '#0C0C0E', minHeight: '100vh' }}>
        <p>Pact not found.</p>
      </main>
    )
  }

  const session = await auth()

  // Not logged in — ask them to sign in first
  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent(`/pacts/${id}/accept?token=${token}`)
    return (
      <main
        style={{
          padding: 32,
          fontFamily: 'IBM Plex Sans, sans-serif',
          color: '#F0EFE8',
          background: '#0C0C0E',
          minHeight: '100vh',
        }}
      >
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28 }}>
          You&apos;ve been invited to a Pact
        </h1>
        <p style={{ color: '#6B7280' }}>{pact.title}</p>
        <a
          href={`/sign-in?callbackUrl=${callbackUrl}`}
          style={{
            display: 'inline-block',
            marginTop: 24,
            background: '#D4FF4F',
            color: '#0C0C0E',
            padding: '12px 24px',
            borderRadius: 6,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Sign in to accept
        </a>
      </main>
    )
  }

  // Already accepted
  if (party.accepted) {
    return (
      <main style={{ padding: 32, fontFamily: 'IBM Plex Sans, sans-serif', color: '#F0EFE8', background: '#0C0C0E', minHeight: '100vh' }}>
        <p>You have already accepted this Pact.</p>
        <a href={`/pacts/${id}`} style={{ color: '#D4FF4F' }}>View Pact →</a>
      </main>
    )
  }

  // Server Action — accept and redirect to pact detail
  async function handleAccept(formData: FormData) {
    'use server'
    const inviteToken = formData.get('inviteToken') as string
    const pactId = formData.get('pactId') as string
    const currentSession = await auth()
    if (!currentSession?.user?.id) redirect('/sign-in')

    try {
      await acceptParty(inviteToken, currentSession.user.id, currentSession.user.name ?? null)
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 400) {
        // Already accepted — just redirect
      } else {
        throw err
      }
    }

    redirect(`/pacts/${pactId}`)
  }

  return (
    <main
      style={{
        padding: 32,
        fontFamily: 'IBM Plex Sans, sans-serif',
        color: '#F0EFE8',
        background: '#0C0C0E',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28 }}>
        You&apos;ve been invited to a Pact
      </h1>

      <div
        style={{
          background: '#141416',
          border: '1px solid #242428',
          borderRadius: 8,
          padding: 20,
          marginTop: 16,
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>{pact.title}</h2>
        <p style={{ color: '#6B7280', margin: 0 }}>{pact.outcomeStatement}</p>
      </div>

      <p style={{ color: '#6B7280' }}>
        Accepting as: <strong style={{ color: '#F0EFE8' }}>{session.user.email}</strong>
      </p>

      <form action={handleAccept}>
        <input type="hidden" name="inviteToken" value={token} />
        <input type="hidden" name="pactId" value={id} />
        <button
          type="submit"
          style={{
            background: '#D4FF4F',
            color: '#0C0C0E',
            padding: '12px 24px',
            border: 'none',
            borderRadius: 6,
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          Accept and join this Pact
        </button>
      </form>
    </main>
  )
}
```

---

- [ ] **Step 9-4: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

- [ ] **Step 9-5: Commit**

```bash
git add "lib/db/queries/pacts.ts" "app/api/pacts/[id]/accept/route.ts" \
  "app/pacts/[id]/accept/page.tsx" && \
git commit -m "feat: Task 9 — party acceptance API + accept page with Server Action"
```

---

**⏸ CHECKPOINT 9 — Stop here.**

Verify the acceptance flow:
1. From Task 7's `createPact` response, find a counterparty's `inviteToken`
2. Navigate to `http://localhost:3000/pacts/<PACT_ID>/accept?token=<INVITE_TOKEN>`
3. Sign in (if prompted) and click "Accept and join this Pact"
4. Verify redirect to pact detail page and party now shows "Accepted"
5. After ALL parties accept, verify pact status flips to `ACTIVE`

---

## Task 10: Condition Fulfilment API

**Files:**
- Create: `lib/db/queries/conditions.ts`
- Create: `app/api/conditions/[id]/fulfil/route.ts`

Note: This task wires up fulfilment but does NOT yet trigger execution. Execution is connected in Task 11.

---

- [ ] **Step 10-1: Create lib/db/queries/conditions.ts**

```bash
mkdir -p /Users/olajideadeluwoye/Desktop/pact/pact/lib/db/queries
```

```typescript
import { db } from '@/lib/db'
import {
  conditions,
  parties,
  conditionFulfilments,
  pacts,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { withDsqlRetry } from '@/lib/dsql-retry'
import { writeAuditInTx } from '@/lib/audit'
import { AppError } from '@/lib/errors'

export interface FulfilConditionInput {
  note?: string
  referenceUrl?: string
  idempotencyKey: string
}

export interface FulfilConditionResult {
  pactId: string
  conditionId: string
}

export async function fulfilConditionByParty(
  conditionId: string,
  userId: string,
  userName: string | null,
  input: FulfilConditionInput,
): Promise<FulfilConditionResult> {
  return withDsqlRetry(() =>
    db.transaction(async (tx) => {
      // Load condition + its assigned party in one query
      const [row] = await tx
        .select({
          condition: conditions,
          party: parties,
          pact: pacts,
        })
        .from(conditions)
        .innerJoin(parties, eq(parties.id, conditions.assignedPartyId))
        .innerJoin(pacts, eq(pacts.id, conditions.pactId))
        .where(eq(conditions.id, conditionId))
        .limit(1)

      if (!row) throw new AppError('Condition not found', 404)
      if (row.party.userId !== userId) {
        throw new AppError('You are not assigned to this condition', 403)
      }
      if (row.condition.status === 'FULFILLED') {
        throw new AppError('Condition is already fulfilled', 400)
      }
      if (row.pact.status !== 'ACTIVE') {
        throw new AppError('Pact is not active', 400)
      }

      // Mark condition fulfilled (idempotencyKey prevents double write on retry)
      await tx
        .update(conditions)
        .set({
          status: 'FULFILLED',
          fulfilledAt: new Date(),
          idempotencyKey: input.idempotencyKey,
        })
        .where(
          and(
            eq(conditions.id, conditionId),
            eq(conditions.status, 'PENDING'),  // guard against race
          ),
        )

      // Record evidence
      await tx.insert(conditionFulfilments).values({
        conditionId,
        partyId: row.party.id,
        note: input.note ?? null,
        referenceUrl: input.referenceUrl ?? null,
      })

      // Write audit entry
      await writeAuditInTx(tx, {
        pactId: row.condition.pactId,
        eventType: 'CONDITION_FULFILLED',
        actorId: userId,
        actorLabel: userName,
        payload: {
          conditionId,
          conditionTitle: row.condition.title,
        },
      })

      return { pactId: row.condition.pactId, conditionId }
    }),
  )
}
```

---

- [ ] **Step 10-2: Create app/api/conditions/[id]/fulfil/route.ts**

```bash
mkdir -p "/Users/olajideadeluwoye/Desktop/pact/pact/app/api/conditions/[id]/fulfil"
```

```typescript
import { auth } from '@/auth'
import { fulfilConditionByParty } from '@/lib/db/queries/conditions'
import { AppError } from '@/lib/errors'
import { z } from 'zod'

const fulfilBody = z.object({
  idempotencyKey: z.string().uuid(),
  note: z.string().max(500).optional(),
  referenceUrl: z.string().url().optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const parsed = fulfilBody.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { id: conditionId } = await params

  try {
    const result = await fulfilConditionByParty(
      conditionId,
      session.user.id,
      session.user.name ?? null,
      parsed.data,
    )
    // pactExecuted will be set in Task 11 once execution is wired up
    return Response.json({ ...result, pactExecuted: false })
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/conditions/[id]/fulfil error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

- [ ] **Step 10-3: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

- [ ] **Step 10-4: Commit**

```bash
git add "lib/db/queries/conditions.ts" "app/api/conditions/[id]/fulfil/route.ts" && \
git commit -m "feat: Task 10 — condition fulfilment API with audit log"
```

---

**⏸ CHECKPOINT 10 — Stop here.**

Verify: with an ACTIVE pact and a session as the assigned party, POST to `/api/conditions/<CONDITION_ID>/fulfil` with `{"idempotencyKey": "some-uuid"}` and confirm `conditions.status` flips to `FULFILLED` in the database.

---

## Task 11: Atomic Execution Transaction (lib/execution.ts)

**Files:**
- Create: `lib/execution.ts`
- Modify: `app/api/conditions/[id]/fulfil/route.ts` — call `attemptPactExecution` after fulfilment

---

- [ ] **Step 11-1: Create lib/execution.ts**

```typescript
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { pacts, conditions, executions, auditLog, parties } from '@/lib/db/schema'
import { eq, and, sql, desc } from 'drizzle-orm'
import { withDsqlRetry } from '@/lib/dsql-retry'
import { computeHash } from '@/lib/audit'

export interface ExecutionResult {
  executed: boolean
  executionHash?: string
}

export async function attemptPactExecution(
  pactId: string,
  triggeringUserId: string,
): Promise<ExecutionResult> {
  // Pre-flight: count pending conditions. Read-only, no transaction needed.
  const [{ pendingCount }] = await db
    .select({ pendingCount: sql<number>`count(*)::int` })
    .from(conditions)
    .where(
      and(eq(conditions.pactId, pactId), eq(conditions.status, 'PENDING')),
    )

  if (pendingCount > 0) {
    return { executed: false }
  }

  // Atomic execution transaction with OCC retry
  return withDsqlRetry(async () => {
    return db.transaction(async (tx) => {
      // Step 3: Update pact status — WHERE status = 'ACTIVE' guards the race.
      // If two concurrent fulfilments both pass the pre-flight above, only one
      // transaction wins here because the other sees 0 rows updated.
      const updated = await tx
        .update(pacts)
        .set({
          status: 'EXECUTED',
          executedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(pacts.id, pactId), eq(pacts.status, 'ACTIVE')))
        .returning({ id: pacts.id })

      if (updated.length === 0) {
        // Another transaction already executed this pact
        return { executed: false }
      }

      // Step 4: Build execution payload snapshot
      const [allParties, allConditions] = await Promise.all([
        tx.select().from(parties).where(eq(parties.pactId, pactId)),
        tx.select().from(conditions).where(eq(conditions.pactId, pactId)),
      ])

      const executionPayload = {
        pactId,
        executedAt: new Date().toISOString(),
        triggeredBy: triggeringUserId,
        parties: allParties.map((p) => ({
          id: p.id,
          email: p.email,
          role: p.role,
          displayName: p.displayName,
        })),
        conditions: allConditions.map((c) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          fulfilledAt: c.fulfilledAt?.toISOString() ?? null,
        })),
      }

      const executionHash = computeHash(executionPayload)

      // Step 4b: Insert execution record.
      // UNIQUE(pact_id) is the database-level idempotency guarantee —
      // if a duplicate somehow reaches here, the constraint rejects it
      // rather than creating a second execution record.
      await tx.insert(executions).values({
        pactId,
        executedBy: triggeringUserId,
        executionHash,
        executionPayload,
      })

      // Step 5: Append to audit log with hash chain (must be inside transaction)
      const [previousEntry] = await tx
        .select({ entryHash: auditLog.entryHash })
        .from(auditLog)
        .where(eq(auditLog.pactId, pactId))
        .orderBy(desc(auditLog.createdAt))
        .limit(1)

      const previousHash = previousEntry?.entryHash ?? 'GENESIS'

      const entryHash = computeHash({
        pactId,
        eventType: 'PACT_EXECUTED',
        actorId: null,
        actorLabel: 'system',
        payload: { executedAt: new Date().toISOString(), executionHash },
        previousHash,
      })

      await tx.insert(auditLog).values({
        pactId,
        eventType: 'PACT_EXECUTED',
        actorId: null,
        actorLabel: 'system',
        payload: { executedAt: new Date().toISOString(), executionHash },
        previousHash,
        entryHash,
      })

      return { executed: true, executionHash }
    })
  })
}
```

---

- [ ] **Step 11-2: Update the fulfil route to call attemptPactExecution**

Replace the entire `app/api/conditions/[id]/fulfil/route.ts` with this updated version:

```typescript
import { auth } from '@/auth'
import { fulfilConditionByParty } from '@/lib/db/queries/conditions'
import { attemptPactExecution } from '@/lib/execution'
import { AppError } from '@/lib/errors'
import { z } from 'zod'

const fulfilBody = z.object({
  idempotencyKey: z.string().uuid(),
  note: z.string().max(500).optional(),
  referenceUrl: z.string().url().optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const parsed = fulfilBody.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { id: conditionId } = await params

  try {
    // Step 1: Mark the condition as fulfilled (atomic, with retry)
    const { pactId } = await fulfilConditionByParty(
      conditionId,
      session.user.id,
      session.user.name ?? null,
      parsed.data,
    )

    // Step 2: Attempt atomic pact execution (no-op if not all conditions met)
    // This runs OUTSIDE the fulfilment transaction — each step is independently ACID.
    const { executed, executionHash } = await attemptPactExecution(
      pactId,
      session.user.id,
    )

    return Response.json({ pactId, conditionId, pactExecuted: executed, executionHash })
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/conditions/[id]/fulfil error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

- [ ] **Step 11-3: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

- [ ] **Step 11-4: Commit**

```bash
git add lib/execution.ts "app/api/conditions/[id]/fulfil/route.ts" && \
git commit -m "feat: Task 11 — atomic execution transaction, UNIQUE(pact_id) idempotency guard"
```

---

**⏸ CHECKPOINT 11 — Stop here. This is the most critical checkpoint.**

Run the full Phase 2 gate test:

1. Create a pact (Task 7): note all invite tokens
2. Submit the pact (transitions to PENDING_ACCEPTANCE)
3. Each counterparty accepts (Task 9): pact transitions to ACTIVE after all accept
4. Each party fulfils their condition (Task 10/11)
5. When the **last** condition is fulfilled, the response should include `"pactExecuted": true`

Verify in the database:
- `pacts` table: `status = 'EXECUTED'`, `executed_at` is set
- `executions` table: exactly **one** row for this pact with `execution_hash` and `execution_payload`
- `audit_log` table: final entry has `event_type = 'PACT_EXECUTED'` with a valid `entry_hash`

---

## Task 12: Audit Completeness Verification

**Files:** No new files. Review existing routes for missing audit entries.

---

- [ ] **Step 12-1: Audit checklist — verify every state transition writes to audit_log**

Run this SQL against your Aurora DSQL instance to see which event types appear after a full test run:

```sql
SELECT event_type, count(*) 
FROM audit_log 
GROUP BY event_type 
ORDER BY event_type;
```

Expected event types for a complete Pact lifecycle:

| Event Type | Written in | Present? |
|---|---|---|
| `PACT_CREATED` | `createPact` in `lib/db/queries/pacts.ts` | ✓ Task 7 |
| `PARTY_INVITED` | `createPact` (one per counterparty) | ✓ Task 7 |
| `PACT_SUBMITTED` | `submitPact` | ✓ Task 7 |
| `PARTY_ACCEPTED` | `acceptParty` | ✓ Task 9 |
| `PACT_ACTIVATED` | `acceptParty` (when all accepted) | ✓ Task 9 |
| `CONDITION_FULFILLED` | `fulfilConditionByParty` | ✓ Task 10 |
| `PACT_EXECUTED` | `attemptPactExecution` | ✓ Task 11 |

---

- [ ] **Step 12-2: Verify hash chain integrity for a test pact**

Run this SQL replacing `<YOUR_PACT_ID>` with an executed pact's ID:

```sql
SELECT 
  event_type,
  previous_hash,
  entry_hash,
  created_at
FROM audit_log
WHERE pact_id = '<YOUR_PACT_ID>'
ORDER BY created_at;
```

Confirm manually:
- First entry has `previous_hash = 'GENESIS'`
- Each subsequent entry's `previous_hash` matches the preceding row's `entry_hash`
- No two entries share the same `entry_hash`

---

- [ ] **Step 12-3: Verify UNIQUE(pact_id) idempotency on executions**

Run against DSQL:

```sql
SELECT pact_id, count(*) as execution_count
FROM executions
GROUP BY pact_id
HAVING count(*) > 1;
```

Expected: 0 rows (no pact has more than one execution record).

---

- [ ] **Step 12-4: Commit verification results**

```bash
git add . && git commit -m "feat: Task 12 — audit completeness verified, Phase 2 gate passed"
```

---

**⏸ CHECKPOINT 12 — Phase 2 complete.**

**Phase 2 Gate — all must be true:**
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Pact creation → PENDING_ACCEPTANCE works via API
- [ ] All counterparties can accept via invite token → ACTIVE
- [ ] Each party can fulfil their assigned condition
- [ ] When last condition fulfilled: `pactExecuted: true` in API response
- [ ] `executions` table has exactly one row per pact
- [ ] `pacts.status = 'EXECUTED'` and `pacts.executed_at` is set
- [ ] Audit log hash chain is intact (GENESIS → chained entries → PACT_EXECUTED)
- [ ] Pact detail page renders correctly at `/pacts/[id]`
- [ ] Acceptance page works at `/pacts/[id]/accept?token=...`

---

## Self-Review

**Spec coverage:**

| PRD Requirement | Covered |
|---|---|
| F-02: Create Pact (parties, conditions, invite tokens) | Task 7 |
| F-03: Accept Pact via invite link | Task 9 |
| F-04: Pact detail view (static, no SSE) | Task 8 |
| F-05: Condition fulfilment with note/URL | Task 10 |
| F-06: Atomic execution transaction (ACID, UNIQUE guard) | Task 11 |
| F-08: Audit log on every state transition | Tasks 7, 9, 10, 11; verified in Task 12 |
| Hash chain tamper evidence | `lib/audit.ts` computeHash, Task 12 verification |
| OCC retry on all writes | `withDsqlRetry` wraps all transactions |
| State machine: DRAFT→PENDING→ACTIVE→EXECUTED | Tasks 7, 9, 11 |
| `executions.UNIQUE(pact_id)` one execution per pact | Task 11, DB schema |
| No SSE or emails yet | Correctly deferred to Phase 3 |

**Phase 3 work not needed here:** email invites, SSE broadcasting, `kv.publish`, execution animation, dashboard filtering, receipt page.
