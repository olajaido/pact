# Phase 3 — Real-time & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Vercel KV-backed SSE real-time updates, the execution animation (the demo moment), a dashboard, and Resend email notifications so the full demo flow works live in two browser windows simultaneously.

**Architecture:** `@vercel/kv` 3.0 uses the Upstash Redis REST API which has **no pub/sub**. Instead: publishers call `kv.rpush` to append events to a per-pact Redis list; the SSE endpoint polls `kv.lrange` with a cursor every 1 second, giving cross-instance fan-out with ~1 s latency. The pact detail page splits into a Server Component (initial data fetch) and `PactDetailClient` (Client Component with useState + SSE hook). Emails fire after DB commits, never inside transactions.

**Tech Stack:** Next.js 16 App Router · `@vercel/kv` 3.0 (rpush/lrange polling) · Server-Sent Events (ReadableStream) · React useState + useCallback · React Email · Resend · CSS transitions (no animation library)

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `lib/sse-types.ts` | **Create** | Shared `PactSSEEvent` discriminated union — imported by server and client |
| `lib/sse.ts` | **Create** | `broadcastPactEvent` (rpush to KV) · `getPactEventsSince` (lrange poll) |
| `app/api/pacts/[id]/stream/route.ts` | **Create** | SSE endpoint — polls KV every 1 s, streams events to browser |
| `hooks/usePactStream.ts` | **Create** | Client hook — EventSource lifecycle, auto-reconnect on error |
| `components/pact/PactDetailClient.tsx` | **Create** | Client Component — holds pact state, wires SSE, renders full detail view |
| `components/pact/ExecutionBanner.tsx` | **Create** | Fixed-position slide-in banner on PACT_EXECUTED |
| `app/pacts/[id]/page.tsx` | **Rewrite** | Thin Server Component — fetches initial data, renders PactDetailClient |
| `components/pact/FulfilButton.tsx` | **Modify** | Remove `window.location.reload()` — SSE event drives update |
| `app/api/pacts/[id]/accept/route.ts` | **Modify** | Broadcast PARTY_ACCEPTED / PACT_ACTIVATED after acceptParty commits |
| `app/api/conditions/[id]/fulfil/route.ts` | **Modify** | Broadcast CONDITION_FULFILLED + PACT_EXECUTED after operations commit |
| `lib/db/queries/pacts.ts` | **Modify** | Add `listPactsWithSummary` for dashboard |
| `components/pact/PactCard.tsx` | **Create** | Dashboard card — title, avatars, status badge, condition progress bar |
| `components/pact/PartyAvatar.tsx` | **Create** | Initials circle with deterministic colour from name hash |
| `app/dashboard/page.tsx` | **Create** | Server Component dashboard — status filter tabs, pact card grid |
| `lib/email/index.ts` | **Create** | Resend client (returns null if API key not set — safe fallback) |
| `lib/email/templates/InviteEmail.tsx` | **Create** | React Email invite template |
| `lib/email/templates/FulfilledEmail.tsx` | **Create** | React Email condition-fulfilled notification |
| `lib/email/templates/ExecutedEmail.tsx` | **Create** | React Email pact-executed confirmation |
| `lib/email/send.ts` | **Create** | Typed send functions: `sendInviteEmails`, `sendFulfilledEmails`, `sendExecutionEmails` |
| `app/api/pacts/[id]/submit/route.ts` | **Modify** | Fire invite emails (non-blocking) after submitPact commits |
| `lib/execution.ts` | **Modify** | No change — execution email called from route handler after returns |

---

## ⚠️ Checkpoint Protocol

Stop after every task commit and wait for explicit approval before starting the next task.

---

## Task 13: SSE Stream Endpoint

**Files:**
- Create: `lib/sse-types.ts`
- Create: `lib/sse.ts`
- Create: `app/api/pacts/[id]/stream/route.ts`

---

- [ ] **Step 13-1: Create lib/sse-types.ts**

Shared discriminated union used by both server (broadcasting) and client (handling).

```typescript
export type PactSSEEvent =
  | { type: 'CONNECTED' }
  | { type: 'PARTY_ACCEPTED'; partyId: string; timestamp: string }
  | { type: 'PACT_ACTIVATED'; timestamp: string }
  | { type: 'CONDITION_FULFILLED'; conditionId: string; timestamp: string }
  | { type: 'PACT_EXECUTED'; executedAt: string; executionHash: string }
  | { type: 'PACT_VOIDED'; timestamp: string }
  | { type: 'DISPUTE_RAISED'; raisedBy: string; reason: string; timestamp: string }
```

---

- [ ] **Step 13-2: Create lib/sse.ts**

`broadcastPactEvent` — appends event to a KV Redis list keyed by pact ID.
`getPactEventsSince` — reads list entries from `fromIndex` to end.
Both guard against missing KV env vars (graceful no-op in local dev without KV).

```typescript
import { kv } from '@vercel/kv'
import type { PactSSEEvent } from './sse-types'

const eventsKey = (pactId: string) => `pact:events:${pactId}`
const TTL_SECONDS = 4 * 60 * 60 // 4 hours — auto-expires old event lists

function kvConfigured(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN,
  )
}

/** Append an event to this pact's KV event list. Call AFTER every DB commit. */
export async function broadcastPactEvent(
  pactId: string,
  event: PactSSEEvent,
): Promise<void> {
  if (!kvConfigured()) return
  try {
    const key = eventsKey(pactId)
    await kv.rpush(key, JSON.stringify(event))
    await kv.expire(key, TTL_SECONDS)
  } catch (err) {
    console.error('[SSE] broadcast error:', err)
  }
}

/** Read all events appended since fromIndex. Returns events + next cursor. */
export async function getPactEventsSince(
  pactId: string,
  fromIndex: number,
): Promise<{ events: PactSSEEvent[]; nextIndex: number }> {
  if (!kvConfigured()) return { events: [], nextIndex: fromIndex }
  try {
    const key = eventsKey(pactId)
    const items = await kv.lrange<string>(key, fromIndex, -1)
    const events = (items ?? []).map((item) => JSON.parse(item) as PactSSEEvent)
    return { events, nextIndex: fromIndex + events.length }
  } catch (err) {
    console.error('[SSE] poll error:', err)
    return { events: [], nextIndex: fromIndex }
  }
}
```

---

- [ ] **Step 13-3: Create app/api/pacts/[id]/stream/route.ts**

```bash
mkdir -p "/Users/olajideadeluwoye/Desktop/pact/pact/app/api/pacts/[id]/stream"
```

```typescript
import { type NextRequest } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { parties } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getPactEventsSince } from '@/lib/sse'

// KV subscribe requires Node.js runtime; Edge runtime does not support it.
export const runtime = 'nodejs'
// 5 minutes max — Vercel Pro limit. Enough for any demo session.
export const maxDuration = 300

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorised', { status: 401 })
  }

  const { id: pactId } = await params

  // Verify the caller is a party to this pact before opening the stream
  const [party] = await db
    .select({ id: parties.id })
    .from(parties)
    .where(
      and(eq(parties.pactId, pactId), eq(parties.userId, session.user.id)),
    )
    .limit(1)

  if (!party) {
    return new Response('Forbidden', { status: 403 })
  }

  const encoder = new TextEncoder()
  let cursor = 0
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Confirm connection immediately
      send({ type: 'CONNECTED' })

      async function poll() {
        if (closed) return
        try {
          const { events, nextIndex } = await getPactEventsSince(pactId, cursor)
          cursor = nextIndex
          for (const event of events) {
            if (closed) return
            send(event)
          }
        } catch {
          // KV unavailable — keep the connection alive, try again next tick
        }
        if (!closed) setTimeout(poll, 1000)
      }

      // First poll after 500ms to catch events broadcast just before stream opened
      setTimeout(poll, 500)

      // Close cleanly when client disconnects (tab closed, navigation, etc.)
      req.signal.addEventListener('abort', () => {
        closed = true
        try {
          controller.close()
        } catch {
          // Already closed — ignore
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

---

- [ ] **Step 13-4: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

- [ ] **Step 13-5: Commit**

```bash
git add lib/sse-types.ts lib/sse.ts "app/api/pacts/[id]/stream/route.ts" && \
git commit -m "feat: Task 13 — SSE stream endpoint, KV-backed event queue (rpush/lrange polling)"
```

---

**⏸ CHECKPOINT 13 — Stop here. Confirm before Task 14.**

Smoke test (requires KV env vars set):
```bash
# In one terminal:
npm run dev

# In another (with your session cookie):
curl -N -H 'Cookie: <session>' http://localhost:3000/api/pacts/<PACT_ID>/stream
```
Expected: `data: {"type":"CONNECTED"}` appears immediately, connection stays open.

---

## Task 14: Client-side SSE Hook + Pact Detail Refactor + Wire Broadcasts

**Files:**
- Create: `hooks/usePactStream.ts`
- Create: `components/pact/PactDetailClient.tsx`
- Rewrite: `app/pacts/[id]/page.tsx` (thin wrapper)
- Modify: `components/pact/FulfilButton.tsx` (remove reload)
- Modify: `app/api/pacts/[id]/accept/route.ts` (broadcast)
- Modify: `app/api/conditions/[id]/fulfil/route.ts` (broadcast)

---

- [ ] **Step 14-1: Create hooks/usePactStream.ts**

```bash
mkdir -p /Users/olajideadeluwoye/Desktop/pact/pact/hooks
```

```typescript
'use client'

import { useEffect } from 'react'
import type { PactSSEEvent } from '@/lib/sse-types'

/**
 * Subscribes to the pact SSE stream. Reconnects automatically on error.
 *
 * IMPORTANT: wrap `onEvent` in useCallback with empty deps at the call site
 * so that the effect does not resubscribe on every render.
 */
export function usePactStream(
  pactId: string,
  onEvent: (event: PactSSEEvent) => void,
): void {
  useEffect(() => {
    let mounted = true
    let eventSource: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (!mounted) return

      eventSource = new EventSource(`/api/pacts/${pactId}/stream`)

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data as string) as PactSSEEvent
          if (event.type !== 'CONNECTED') onEvent(event)
        } catch {
          // Ignore malformed messages
        }
      }

      eventSource.onerror = () => {
        eventSource?.close()
        eventSource = null
        if (mounted) reconnectTimer = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      mounted = false
      eventSource?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [pactId, onEvent]) // onEvent must be stable (useCallback at call site)
}
```

---

- [ ] **Step 14-2: Create components/pact/PactDetailClient.tsx**

This Client Component holds all SSE-driven state. It receives the initial server-fetched data as props and updates it in-place as SSE events arrive. `useCallback` with empty deps + functional `setState` ensures the event handler is stable and always sees current state.

```tsx
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePactStream } from '@/hooks/usePactStream'
import { FulfilButton } from '@/components/pact/FulfilButton'
import { ExecutionBanner } from '@/components/pact/ExecutionBanner'
import type { PactDetail } from '@/lib/db/queries/pacts'
import type { PactSSEEvent } from '@/lib/sse-types'
import type { Pact, Party, Condition, AuditLogEntry } from '@/lib/db/schema'

interface State {
  pact: Pact
  parties: Party[]
  conditions: Condition[]
  auditLog: AuditLogEntry[]
  justExecuted: boolean
}

interface Props {
  pactId: string
  initialData: PactDetail
  currentUserId: string
}

export function PactDetailClient({ pactId, initialData, currentUserId }: Props) {
  const router = useRouter()
  const auditRef = useRef<HTMLDivElement>(null)

  const [state, setState] = useState<State>({
    pact: initialData.pact,
    parties: initialData.parties,
    conditions: initialData.conditions,
    auditLog: initialData.auditLog,
    justExecuted: false,
  })

  const currentParty = initialData.currentParty

  // Stable event handler — empty deps + functional setState always sees current state
  const handleEvent = useCallback((event: PactSSEEvent) => {
    switch (event.type) {
      case 'PARTY_ACCEPTED':
        setState((prev) => ({
          ...prev,
          parties: prev.parties.map((p) =>
            p.id === event.partyId ? { ...p, accepted: true } : p,
          ),
        }))
        break

      case 'PACT_ACTIVATED':
        setState((prev) => ({
          ...prev,
          pact: { ...prev.pact, status: 'ACTIVE' },
        }))
        break

      case 'CONDITION_FULFILLED':
        setState((prev) => ({
          ...prev,
          conditions: prev.conditions.map((c) =>
            c.id === event.conditionId
              ? { ...c, status: 'FULFILLED', fulfilledAt: new Date(event.timestamp) }
              : c,
          ),
        }))
        break

      case 'PACT_EXECUTED':
        setState((prev) => ({
          ...prev,
          pact: {
            ...prev.pact,
            status: 'EXECUTED',
            executedAt: new Date(event.executedAt),
          },
          justExecuted: true,
        }))
        break

      default:
        break
    }
  }, []) // Empty deps — functional setState handles current state

  usePactStream(pactId, handleEvent)

  // After execution animation plays, refresh server state to get full audit log + hash
  useEffect(() => {
    if (!state.justExecuted) return
    const timer = setTimeout(() => {
      router.refresh()
    }, 2500)
    return () => clearTimeout(timer)
  }, [state.justExecuted, router])

  // Auto-scroll audit timeline when new entries arrive
  useEffect(() => {
    if (auditRef.current) {
      auditRef.current.scrollTop = auditRef.current.scrollHeight
    }
  }, [state.auditLog.length])

  const partyMap = new Map(state.parties.map((p) => [p.id, p]))

  const statusColor =
    state.pact.status === 'EXECUTED'
      ? '#22C55E'
      : state.pact.status === 'ACTIVE'
        ? '#D4FF4F'
        : state.pact.status === 'IN_DISPUTE'
          ? '#F59E0B'
          : '#6B7280'

  return (
    <>
      <ExecutionBanner
        visible={state.pact.status === 'EXECUTED'}
        executedAt={state.pact.executedAt}
      />

      <main
        style={{
          padding: 32,
          paddingTop: state.pact.status === 'EXECUTED' ? 80 : 32,
          fontFamily: 'IBM Plex Sans, sans-serif',
          color: '#F0EFE8',
          background: '#0C0C0E',
          minHeight: '100vh',
          maxWidth: 960,
          margin: '0 auto',
          transition: 'padding-top 0.4s ease',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 32,
              margin: '0 0 8px',
            }}
          >
            {state.pact.title}
          </h1>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 999,
              background: statusColor,
              color: '#0C0C0E',
              fontWeight: 700,
              fontSize: 12,
              transition: 'background-color 0.5s ease, transform 0.3s ease',
              transform: state.justExecuted ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {state.pact.status}
          </span>
        </div>

        {/* Outcome */}
        {state.pact.outcomeStatement && (
          <div
            style={{
              background: '#141416',
              border: '1px solid #242428',
              borderRadius: 8,
              padding: 16,
              marginBottom: 32,
            }}
          >
            <p style={{ margin: 0, color: '#6B7280', fontSize: 13 }}>Outcome</p>
            <p style={{ margin: '4px 0 0', fontWeight: 600 }}>
              {state.pact.outcomeStatement}
            </p>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            gap: 32,
            alignItems: 'start',
          }}
        >
          {/* Left column */}
          <div>
            {/* Parties */}
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                Parties
              </h2>
              {state.parties.map((party) => (
                <div
                  key={party.id}
                  style={{
                    background: '#141416',
                    border: '1px solid #242428',
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'border-color 0.3s ease',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>
                      {party.displayName ?? party.email}
                    </span>
                    <span style={{ color: '#6B7280', marginLeft: 8, fontSize: 12 }}>
                      {party.role}
                    </span>
                  </div>
                  <span
                    style={{
                      color: party.accepted ? '#22C55E' : '#F59E0B',
                      fontWeight: 600,
                      fontSize: 12,
                      transition: 'color 0.3s ease',
                    }}
                  >
                    {party.accepted ? '✓ Accepted' : 'Pending'}
                  </span>
                </div>
              ))}
            </section>

            {/* Conditions */}
            <section>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                Conditions
              </h2>
              {state.conditions.map((condition) => {
                const assignedParty = partyMap.get(condition.assignedPartyId)
                const isAssignedToMe =
                  condition.assignedPartyId === currentParty?.id
                const canFulfil =
                  isAssignedToMe &&
                  condition.status === 'PENDING' &&
                  state.pact.status === 'ACTIVE'

                return (
                  <div
                    key={condition.id}
                    style={{
                      background: '#141416',
                      borderLeft: `4px solid ${condition.status === 'FULFILLED' ? '#22C55E' : '#242428'}`,
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 8,
                      transition: 'border-left-color 0.4s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>
                          {condition.title}
                        </p>
                        {condition.description && (
                          <p
                            style={{
                              color: '#6B7280',
                              fontSize: 13,
                              margin: '4px 0 0',
                            }}
                          >
                            {condition.description}
                          </p>
                        )}
                        <p style={{ fontSize: 12, color: '#6B7280', margin: '6px 0 0' }}>
                          →{' '}
                          {assignedParty?.displayName ??
                            assignedParty?.email ??
                            'Unknown'}
                        </p>
                      </div>
                      <span
                        style={{
                          color:
                            condition.status === 'FULFILLED'
                              ? '#22C55E'
                              : '#F59E0B',
                          fontWeight: 700,
                          fontSize: 12,
                          marginLeft: 16,
                          flexShrink: 0,
                          transition: 'color 0.3s ease',
                        }}
                      >
                        {condition.status}
                      </span>
                    </div>
                    {canFulfil && (
                      <div style={{ marginTop: 12 }}>
                        <FulfilButton conditionId={condition.id} pactId={pactId} />
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
          </div>

          {/* Right column — Audit Trail */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              Audit Trail
            </h2>
            <div
              ref={auditRef}
              style={{
                background: '#141416',
                border: '1px solid #242428',
                borderRadius: 8,
                padding: 16,
                maxHeight: 480,
                overflowY: 'auto',
              }}
            >
              <div style={{ position: 'relative', paddingLeft: 20 }}>
                {state.auditLog.map((entry, i) => (
                  <div
                    key={entry.id}
                    style={{
                      position: 'relative',
                      paddingBottom: i < state.auditLog.length - 1 ? 20 : 0,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: -16,
                        top: 5,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background:
                          entry.eventType === 'PACT_EXECUTED'
                            ? '#22C55E'
                            : '#D4FF4F',
                        transition: 'background-color 0.3s ease',
                      }}
                    />
                    {i < state.auditLog.length - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: -13,
                          top: 13,
                          width: 2,
                          bottom: 0,
                          background: '#242428',
                        }}
                      />
                    )}
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        color:
                          entry.eventType === 'PACT_EXECUTED'
                            ? '#22C55E'
                            : '#F0EFE8',
                      }}
                    >
                      {entry.eventType}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6B7280' }}>
                      {entry.actorLabel ?? 'system'} ·{' '}
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
```

---

- [ ] **Step 14-3: Rewrite app/pacts/[id]/page.tsx as a thin Server Component**

Replace the entire file with this:

```tsx
import { auth } from '@/auth'
import { getPactById } from '@/lib/db/queries/pacts'
import { notFound, redirect } from 'next/navigation'
import { PactDetailClient } from '@/components/pact/PactDetailClient'

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
      <main
        style={{
          padding: 32,
          fontFamily: 'IBM Plex Sans, sans-serif',
          color: '#F0EFE8',
          background: '#0C0C0E',
          minHeight: '100vh',
        }}
      >
        <p>You are not a party to this Pact.</p>
      </main>
    )
  }

  return (
    <PactDetailClient
      pactId={id}
      initialData={data}
      currentUserId={session.user.id}
    />
  )
}
```

---

- [ ] **Step 14-4: Update FulfilButton — remove window.location.reload()**

In `components/pact/FulfilButton.tsx`, replace the `window.location.reload()` call. The SSE event received within ~1 second will update the condition status in `PactDetailClient` state.

Replace the `handleClick` function body:

```tsx
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
      const body = (await res.json()) as { error?: string }
      setError(body.error ?? 'Failed to fulfil condition')
    }
    // No reload — SSE event drives the UI update in PactDetailClient
  } catch {
    setError('Network error')
  } finally {
    setLoading(false)
  }
}
```

---

- [ ] **Step 14-5: Update accept route to broadcast PARTY_ACCEPTED / PACT_ACTIVATED**

In `app/api/pacts/[id]/accept/route.ts`, add broadcast calls after `acceptParty` returns. Replace the `try` block content:

```typescript
import { broadcastPactEvent } from '@/lib/sse'

// (inside the try block, after the existing imports)
try {
  const result = await acceptParty(
    parsed.data.inviteToken,
    session.user.id,
    session.user.name ?? null,
  )

  // Broadcast PARTY_ACCEPTED — non-blocking, best-effort
  void broadcastPactEvent(result.pactId, {
    type: 'PARTY_ACCEPTED',
    partyId: result.party.id,
    timestamp: new Date().toISOString(),
  }).catch(console.error)

  // If this acceptance triggered ACTIVE, broadcast PACT_ACTIVATED too
  if (result.pactStatus === 'ACTIVE') {
    void broadcastPactEvent(result.pactId, {
      type: 'PACT_ACTIVATED',
      timestamp: new Date().toISOString(),
    }).catch(console.error)
  }

  return Response.json(result)
} catch (err) {
  if (err instanceof AppError) {
    return Response.json({ error: err.message }, { status: err.statusCode })
  }
  console.error('POST /api/pacts/[id]/accept error:', err)
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}
```

The full updated `app/api/pacts/[id]/accept/route.ts`:

```typescript
import { auth } from '@/auth'
import { acceptParty } from '@/lib/db/queries/pacts'
import { broadcastPactEvent } from '@/lib/sse'
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

  await params

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

    void broadcastPactEvent(result.pactId, {
      type: 'PARTY_ACCEPTED',
      partyId: result.party.id,
      timestamp: new Date().toISOString(),
    }).catch(console.error)

    if (result.pactStatus === 'ACTIVE') {
      void broadcastPactEvent(result.pactId, {
        type: 'PACT_ACTIVATED',
        timestamp: new Date().toISOString(),
      }).catch(console.error)
    }

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

- [ ] **Step 14-6: Update fulfil route to broadcast CONDITION_FULFILLED / PACT_EXECUTED**

Full updated `app/api/conditions/[id]/fulfil/route.ts`:

```typescript
import { auth } from '@/auth'
import { fulfilConditionByParty } from '@/lib/db/queries/conditions'
import { attemptPactExecution } from '@/lib/execution'
import { broadcastPactEvent } from '@/lib/sse'
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
    const { pactId } = await fulfilConditionByParty(
      conditionId,
      session.user.id,
      session.user.name ?? null,
      parsed.data,
    )

    // Broadcast CONDITION_FULFILLED — after DB commit, best-effort
    void broadcastPactEvent(pactId, {
      type: 'CONDITION_FULFILLED',
      conditionId,
      timestamp: new Date().toISOString(),
    }).catch(console.error)

    const { executed, executionHash } = await attemptPactExecution(
      pactId,
      session.user.id,
    )

    if (executed && executionHash) {
      // Broadcast PACT_EXECUTED — after execution transaction commits
      void broadcastPactEvent(pactId, {
        type: 'PACT_EXECUTED',
        executedAt: new Date().toISOString(),
        executionHash,
      }).catch(console.error)
    }

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

- [ ] **Step 14-7: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

- [ ] **Step 14-8: Commit**

```bash
git add hooks/usePactStream.ts \
  components/pact/PactDetailClient.tsx \
  "app/pacts/[id]/page.tsx" \
  components/pact/FulfilButton.tsx \
  "app/api/pacts/[id]/accept/route.ts" \
  "app/api/conditions/[id]/fulfil/route.ts" && \
git commit -m "feat: Task 14 — SSE hook, PactDetailClient, live condition + execution updates"
```

---

**⏸ CHECKPOINT 14 — Stop here.**

Two-browser test (requires KV env vars):
1. Open `/pacts/<PACT_ID>` in Browser A and Browser B (both as parties)
2. In Browser A, click "Mark as Fulfilled" on a condition
3. Browser B should see the condition's status flip to FULFILLED within ~1 second — **no page reload**
4. When the last condition is fulfilled from either browser, watch both browsers update `EXECUTED`

---

## Task 15: Execution Animation

**Files:**
- Create: `components/pact/ExecutionBanner.tsx`

`PactDetailClient` already has the animation logic (status badge scale, banner visibility, audit scroll). This task creates the `ExecutionBanner` component that `PactDetailClient` references.

---

- [ ] **Step 15-1: Create components/pact/ExecutionBanner.tsx**

```tsx
'use client'

interface ExecutionBannerProps {
  visible: boolean
  executedAt?: Date | string | null
}

export function ExecutionBanner({ visible, executedAt }: ExecutionBannerProps) {
  const ts = executedAt
    ? new Date(executedAt).toLocaleString()
    : null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: '#22C55E',
        color: '#0C0C0E',
        padding: '14px 32px',
        textAlign: 'center',
        fontWeight: 700,
        fontSize: 16,
        letterSpacing: '0.08em',
        // Slide in from top when visible
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <span>PACT EXECUTED</span>
      {ts && (
        <span
          style={{ fontWeight: 400, fontSize: 13, opacity: 0.75 }}
        >
          {ts}
        </span>
      )}
    </div>
  )
}
```

---

- [ ] **Step 15-2: Verify ExecutionBanner is imported in PactDetailClient**

`PactDetailClient.tsx` already imports `ExecutionBanner` at line 6. Confirm this import resolves:

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

- [ ] **Step 15-3: Commit**

```bash
git add components/pact/ExecutionBanner.tsx && \
git commit -m "feat: Task 15 — execution animation, slide-in banner, status badge scale"
```

---

**⏸ CHECKPOINT 15 — Stop here.**

Trigger a pact execution. Both browsers should:
1. Status badge animates — scales up briefly then settles on green
2. Green `PACT EXECUTED` banner slides in from the top with a spring easing
3. 2.5 seconds later, `router.refresh()` fires and the page re-renders with the definitive server state (execution hash visible in audit trail)

---

## Task 16: Dashboard Page

**Files:**
- Modify: `lib/db/queries/pacts.ts` — add `listPactsWithSummary`
- Create: `components/pact/PartyAvatar.tsx`
- Create: `components/pact/PactCard.tsx`
- Create: `app/dashboard/page.tsx`

---

- [ ] **Step 16-1: Add listPactsWithSummary to lib/db/queries/pacts.ts**

Add this import at the top of `lib/db/queries/pacts.ts` (alongside existing imports):

```typescript
import { inArray } from 'drizzle-orm'
```

Then append `listPactsWithSummary` after `listPactsForUser`:

```typescript
// ─── listPactsWithSummary ────────────────────────────────────

export interface PactSummary {
  pact: Pact
  parties: Array<Pick<Party, 'id' | 'displayName' | 'email' | 'userId'>>
  conditionTotal: number
  conditionFulfilled: number
}

export async function listPactsWithSummary(
  userId: string,
  status?: string,
): Promise<PactSummary[]> {
  const pactRows = await db
    .select({ pact: pacts })
    .from(pacts)
    .innerJoin(
      parties,
      and(eq(parties.pactId, pacts.id), eq(parties.userId, userId)),
    )
    .where(status ? eq(pacts.status, status) : undefined)
    .orderBy(desc(pacts.updatedAt))

  if (pactRows.length === 0) return []

  const pactList = pactRows.map((r) => r.pact)
  const pactIds = pactList.map((p) => p.id)

  const [allParties, condCounts] = await Promise.all([
    db
      .select({
        id: parties.id,
        pactId: parties.pactId,
        displayName: parties.displayName,
        email: parties.email,
        userId: parties.userId,
      })
      .from(parties)
      .where(inArray(parties.pactId, pactIds)),

    db
      .select({
        pactId: conditions.pactId,
        total: sql<number>`count(*)::int`,
        fulfilled:
          sql<number>`sum(case when ${conditions.status} = 'FULFILLED' then 1 else 0 end)::int`,
      })
      .from(conditions)
      .where(inArray(conditions.pactId, pactIds))
      .groupBy(conditions.pactId),
  ])

  const partiesByPact = new Map<
    string,
    Array<Pick<Party, 'id' | 'displayName' | 'email' | 'userId'>>
  >()
  for (const p of allParties) {
    const arr = partiesByPact.get(p.pactId) ?? []
    arr.push(p)
    partiesByPact.set(p.pactId, arr)
  }

  const countsByPact = new Map(condCounts.map((c) => [c.pactId, c]))

  return pactList.map((pact) => {
    const counts = countsByPact.get(pact.id) ?? { total: 0, fulfilled: 0 }
    return {
      pact,
      parties: partiesByPact.get(pact.id) ?? [],
      conditionTotal: counts.total,
      conditionFulfilled: counts.fulfilled,
    }
  })
}
```

---

- [ ] **Step 16-2: Create components/pact/PartyAvatar.tsx**

Deterministic color from name hash — same name always gets the same colour across sessions.

```tsx
const AVATAR_COLORS = [
  '#D4FF4F',
  '#22C55E',
  '#60A5FA',
  '#F472B6',
  '#A78BFA',
  '#F59E0B',
]

function hashName(name: string): number {
  let h = 0
  for (const c of name) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length]
}

interface PartyAvatarProps {
  name: string
  size?: number
}

export function PartyAvatar({ name, size = 32 }: PartyAvatarProps) {
  const initial = name.trim()[0]?.toUpperCase() ?? '?'
  const bg = getAvatarColor(name)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: '#0C0C0E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.4,
        flexShrink: 0,
        userSelect: 'none',
      }}
      title={name}
    >
      {initial}
    </div>
  )
}
```

---

- [ ] **Step 16-3: Create components/pact/PactCard.tsx**

```tsx
import { PartyAvatar } from './PartyAvatar'
import type { PactSummary } from '@/lib/db/queries/pacts'

interface PactCardProps {
  summary: PactSummary
}

export function PactCard({ summary }: PactCardProps) {
  const { pact, parties, conditionTotal, conditionFulfilled } = summary

  const statusColor =
    pact.status === 'EXECUTED'
      ? '#22C55E'
      : pact.status === 'ACTIVE'
        ? '#D4FF4F'
        : pact.status === 'IN_DISPUTE'
          ? '#F59E0B'
          : '#6B7280'

  const progressPct =
    conditionTotal > 0
      ? Math.round((conditionFulfilled / conditionTotal) * 100)
      : 0

  return (
    <a
      href={`/pacts/${pact.id}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        style={{
          background: '#141416',
          border: '1px solid #242428',
          borderRadius: 8,
          padding: 20,
          cursor: 'pointer',
        }}
      >
        {/* Title + status */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 12,
            gap: 12,
          }}
        >
          <h3
            style={{
              margin: 0,
              color: '#F0EFE8',
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            {pact.title}
          </h3>
          <span
            style={{
              background: statusColor,
              color: '#0C0C0E',
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {pact.status}
          </span>
        </div>

        {/* Party avatars */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {parties.slice(0, 4).map((p) => (
            <PartyAvatar
              key={p.id}
              name={p.displayName ?? p.email}
              size={28}
            />
          ))}
          {parties.length > 4 && (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#242428',
                color: '#6B7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              +{parties.length - 4}
            </div>
          )}
        </div>

        {/* Condition progress */}
        {conditionTotal > 0 && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {conditionFulfilled} of {conditionTotal} conditions met
              </span>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {new Date(pact.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <div
              style={{
                background: '#242428',
                borderRadius: 999,
                height: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: pact.status === 'EXECUTED' ? '#22C55E' : '#D4FF4F',
                  width: `${progressPct}%`,
                  height: '100%',
                  borderRadius: 999,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </a>
  )
}
```

---

- [ ] **Step 16-4: Create app/dashboard/page.tsx**

```bash
mkdir -p /Users/olajideadeluwoye/Desktop/pact/pact/app/dashboard
```

```tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listPactsWithSummary } from '@/lib/db/queries/pacts'
import { PactCard } from '@/components/pact/PactCard'

const STATUS_TABS = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending', value: 'PENDING_ACCEPTANCE' },
  { label: 'Executed', value: 'EXECUTED' },
  { label: 'Voided', value: 'VOID' },
] as const

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')

  const { status } = await searchParams
  const summaries = await listPactsWithSummary(session.user.id, status)

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}
      >
        <h1
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 32,
            margin: 0,
          }}
        >
          Your Pacts
        </h1>
        <a
          href="/pacts/new"
          style={{
            background: '#D4FF4F',
            color: '#0C0C0E',
            padding: '10px 20px',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          + New Pact
        </a>
      </div>

      {/* Status filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 28,
          borderBottom: '1px solid #242428',
          paddingBottom: 12,
        }}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = (tab.value ?? '') === (status ?? '')
          return (
            <a
              key={tab.label}
              href={
                tab.value
                  ? `/dashboard?status=${tab.value}`
                  : '/dashboard'
              }
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: isActive ? 700 : 400,
                background: isActive ? '#D4FF4F' : 'transparent',
                color: isActive ? '#0C0C0E' : '#6B7280',
                textDecoration: 'none',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              {tab.label}
            </a>
          )
        })}
      </div>

      {/* Pact grid or empty state */}
      {summaries.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 0',
          }}
        >
          <p
            style={{
              color: '#6B7280',
              fontSize: 16,
              marginBottom: 24,
            }}
          >
            {status
              ? 'No pacts with this status.'
              : 'You have no pacts yet.'}
          </p>
          <a
            href="/pacts/new"
            style={{
              background: '#D4FF4F',
              color: '#0C0C0E',
              padding: '12px 24px',
              borderRadius: 6,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Create your first Pact
          </a>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {summaries.map((summary) => (
            <PactCard key={summary.pact.id} summary={summary} />
          ))}
        </div>
      )}
    </main>
  )
}
```

---

- [ ] **Step 16-5: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

- [ ] **Step 16-6: Commit**

```bash
git add lib/db/queries/pacts.ts \
  components/pact/PartyAvatar.tsx \
  components/pact/PactCard.tsx \
  app/dashboard/page.tsx && \
git commit -m "feat: Task 16 — dashboard page, PactCard, PartyAvatar, listPactsWithSummary"
```

---

**⏸ CHECKPOINT 16 — Stop here.**

Verify:
- Navigate to `http://localhost:3000/dashboard`
- Pact cards show with status badges, party avatars, and condition progress bars
- Status filter tabs work (click Active → shows only ACTIVE pacts)
- "New Pact" button is visible and prominent

---

## Task 17: Email Notifications via Resend

**Files:**
- Create: `lib/email/index.ts`
- Create: `lib/email/templates/InviteEmail.tsx`
- Create: `lib/email/templates/FulfilledEmail.tsx`
- Create: `lib/email/templates/ExecutedEmail.tsx`
- Create: `lib/email/send.ts`
- Modify: `app/api/pacts/[id]/submit/route.ts` — fire invite emails (non-blocking)
- Modify: `app/api/conditions/[id]/fulfil/route.ts` — fire fulfilled + execution emails

---

- [ ] **Step 17-1: Create lib/email/index.ts**

```bash
mkdir -p /Users/olajideadeluwoye/Desktop/pact/pact/lib/email/templates
```

```typescript
import { Resend } from 'resend'

// Returns null when API key is not configured — callers check before sending
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export const FROM_ADDRESS = 'noreply@usepact.app'
```

---

- [ ] **Step 17-2: Create lib/email/templates/InviteEmail.tsx**

React Email renders to HTML. Use light-theme styles — dark mode is not reliably supported in email clients.

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Preview,
} from '@react-email/components'

interface InviteEmailProps {
  pactTitle: string
  creatorName: string
  outcomeStatement: string
  conditionTitle: string
  acceptUrl: string
}

export function InviteEmail({
  pactTitle,
  creatorName,
  outcomeStatement,
  conditionTitle,
  acceptUrl,
}: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{creatorName} invited you to a Pact: {pactTitle}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', background: '#F5F5F5', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: '40px auto', background: '#FFFFFF', borderRadius: 8, padding: 32 }}>
          <Heading style={{ fontSize: 24, marginBottom: 8, color: '#0C0C0E' }}>
            You&apos;ve been invited to a Pact
          </Heading>
          <Text style={{ color: '#555', marginTop: 0 }}>
            <strong>{creatorName}</strong> has invited you to participate in:
          </Text>
          <Text style={{ fontSize: 18, fontWeight: 700, color: '#0C0C0E' }}>
            {pactTitle}
          </Text>
          <Text style={{ color: '#555' }}>
            <strong>Outcome:</strong> {outcomeStatement}
          </Text>
          <Hr style={{ borderColor: '#E5E5E5', margin: '20px 0' }} />
          <Text style={{ color: '#555' }}>
            <strong>Your obligation:</strong>
          </Text>
          <Text style={{ background: '#F9F9F9', padding: '12px 16px', borderRadius: 6, borderLeft: '3px solid #22C55E', color: '#0C0C0E' }}>
            {conditionTitle}
          </Text>
          <Button
            href={acceptUrl}
            style={{
              display: 'inline-block',
              marginTop: 24,
              background: '#0C0C0E',
              color: '#D4FF4F',
              padding: '12px 24px',
              borderRadius: 6,
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            Review and Accept
          </Button>
          <Text style={{ color: '#999', fontSize: 12, marginTop: 32 }}>
            Powered by Pact — programmable commitments.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

---

- [ ] **Step 17-3: Create lib/email/templates/FulfilledEmail.tsx**

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Preview,
} from '@react-email/components'

interface FulfilledEmailProps {
  pactTitle: string
  conditionTitle: string
  fulfilledByName: string
  totalConditions: number
  fulfilledConditions: number
  pactUrl: string
}

export function FulfilledEmail({
  pactTitle,
  conditionTitle,
  fulfilledByName,
  totalConditions,
  fulfilledConditions,
  pactUrl,
}: FulfilledEmailProps) {
  const remaining = totalConditions - fulfilledConditions

  return (
    <Html>
      <Head />
      <Preview>Progress update on {pactTitle}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', background: '#F5F5F5', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: '40px auto', background: '#FFFFFF', borderRadius: 8, padding: 32 }}>
          <Heading style={{ fontSize: 22, marginBottom: 8, color: '#0C0C0E' }}>
            A condition has been fulfilled
          </Heading>
          <Text style={{ color: '#555', marginTop: 0 }}>
            On <strong>{pactTitle}</strong>:
          </Text>
          <Text style={{ background: '#F9F9F9', padding: '12px 16px', borderRadius: 6, borderLeft: '3px solid #22C55E', color: '#0C0C0E' }}>
            <strong>{conditionTitle}</strong>
            <br />
            <span style={{ fontSize: 13, color: '#555' }}>Fulfilled by {fulfilledByName}</span>
          </Text>
          <Text style={{ color: '#555' }}>
            Progress: <strong>{fulfilledConditions} of {totalConditions}</strong> conditions met.
            {remaining > 0
              ? ` ${remaining} remaining.`
              : ' All conditions are now fulfilled.'}
          </Text>
          <Hr style={{ borderColor: '#E5E5E5', margin: '20px 0' }} />
          <Button
            href={pactUrl}
            style={{
              display: 'inline-block',
              background: '#0C0C0E',
              color: '#D4FF4F',
              padding: '12px 24px',
              borderRadius: 6,
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            View Pact
          </Button>
        </Container>
      </Body>
    </Html>
  )
}
```

---

- [ ] **Step 17-4: Create lib/email/templates/ExecutedEmail.tsx**

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Preview,
} from '@react-email/components'

interface ExecutedEmailProps {
  pactTitle: string
  outcomeStatement: string
  executedAt: string
  receiptUrl: string
  executionHash: string
}

export function ExecutedEmail({
  pactTitle,
  outcomeStatement,
  executedAt,
  receiptUrl,
  executionHash,
}: ExecutedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Pact executed: {pactTitle}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', background: '#F5F5F5', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: '40px auto', background: '#FFFFFF', borderRadius: 8, padding: 32 }}>
          <div style={{ background: '#22C55E', borderRadius: 6, padding: '16px 20px', marginBottom: 24 }}>
            <Heading style={{ color: '#0C0C0E', margin: 0, fontSize: 22 }}>
              PACT EXECUTED
            </Heading>
          </div>
          <Text style={{ fontSize: 18, fontWeight: 700, color: '#0C0C0E' }}>
            {pactTitle}
          </Text>
          <Text style={{ color: '#555' }}>
            <strong>Outcome achieved:</strong> {outcomeStatement}
          </Text>
          <Text style={{ color: '#555' }}>
            <strong>Executed at:</strong> {new Date(executedAt).toLocaleString()}
          </Text>
          <Hr style={{ borderColor: '#E5E5E5', margin: '20px 0' }} />
          <Text style={{ color: '#999', fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            Execution hash: {executionHash}
          </Text>
          <Button
            href={receiptUrl}
            style={{
              display: 'inline-block',
              marginTop: 16,
              background: '#0C0C0E',
              color: '#D4FF4F',
              padding: '12px 24px',
              borderRadius: 6,
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            View Execution Receipt
          </Button>
          <Text style={{ color: '#999', fontSize: 12, marginTop: 32 }}>
            This record is tamper-evident. The execution hash above is the SHA-256 fingerprint of this Pact&apos;s execution.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

---

- [ ] **Step 17-5: Create lib/email/send.ts**

All send functions are fire-and-forget — call with `void sendXxx(...).catch(console.error)`. They do nothing if Resend is not configured.

```typescript
import { render } from '@react-email/render'
import { resend, FROM_ADDRESS } from './index'
import { InviteEmail } from './templates/InviteEmail'
import { FulfilledEmail } from './templates/FulfilledEmail'
import { ExecutedEmail } from './templates/ExecutedEmail'
import { db } from '@/lib/db'
import { parties, conditions, pacts, conditionFulfilments } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

const appUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/** Send invite emails to all PARTICIPANT parties after pact submission. */
export async function sendInviteEmails(pactId: string): Promise<void> {
  if (!resend) return

  const [pactRow, partyList, conditionList] = await Promise.all([
    db.select().from(pacts).where(eq(pacts.id, pactId)).limit(1),
    db.select().from(parties).where(eq(parties.pactId, pactId)),
    db.select().from(conditions).where(eq(conditions.pactId, pactId)),
  ])

  const pact = pactRow[0]
  if (!pact) return

  const creator = partyList.find((p) => p.role === 'CREATOR')
  const counterparties = partyList.filter((p) => p.role === 'PARTICIPANT')

  for (const party of counterparties) {
    const partyConds = conditionList.filter(
      (c) => c.assignedPartyId === party.id,
    )
    const firstCond = partyConds[0]

    const acceptUrl = `${appUrl()}/pacts/${pactId}/accept?token=${party.inviteToken}`

    const html = await render(
      InviteEmail({
        pactTitle: pact.title,
        creatorName: creator?.displayName ?? 'Someone',
        outcomeStatement: pact.outcomeStatement,
        conditionTitle: firstCond?.title ?? 'See pact details',
        acceptUrl,
      }),
    )

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: party.email,
      subject: `You've been invited to a Pact: ${pact.title}`,
      html,
    })
  }
}

/** Notify other parties that a condition was fulfilled. */
export async function sendFulfilledEmails(
  pactId: string,
  conditionId: string,
  fulfilledByUserId: string,
): Promise<void> {
  if (!resend) return

  const [pactRow, partyList, conditionList, fulfilmentRows] = await Promise.all([
    db.select().from(pacts).where(eq(pacts.id, pactId)).limit(1),
    db.select().from(parties).where(eq(parties.pactId, pactId)),
    db.select().from(conditions).where(eq(conditions.pactId, pactId)),
    db.select().from(conditionFulfilments).where(eq(conditionFulfilments.conditionId, conditionId)).limit(1),
  ])

  const pact = pactRow[0]
  const fulfilledCondition = conditionList.find((c) => c.id === conditionId)
  const fulfilledByParty = partyList.find((p) => p.userId === fulfilledByUserId)
  if (!pact || !fulfilledCondition || !fulfilledByParty) return

  const fulfilledCount = conditionList.filter(
    (c) => c.status === 'FULFILLED',
  ).length

  const pactUrl = `${appUrl()}/pacts/${pactId}`

  // Notify all OTHER parties (not the one who fulfilled)
  const recipients = partyList.filter((p) => p.userId !== fulfilledByUserId && p.email)

  for (const party of recipients) {
    const html = await render(
      FulfilledEmail({
        pactTitle: pact.title,
        conditionTitle: fulfilledCondition.title,
        fulfilledByName: fulfilledByParty.displayName ?? fulfilledByParty.email,
        totalConditions: conditionList.length,
        fulfilledConditions: fulfilledCount,
        pactUrl,
      }),
    )

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: party.email,
      subject: `Progress update on: ${pact.title}`,
      html,
    })
  }
}

/** Send execution confirmation to all parties. */
export async function sendExecutionEmails(
  pactId: string,
  executionHash: string,
): Promise<void> {
  if (!resend) return

  const [pactRow, partyList] = await Promise.all([
    db.select().from(pacts).where(eq(pacts.id, pactId)).limit(1),
    db.select().from(parties).where(eq(parties.pactId, pactId)),
  ])

  const pact = pactRow[0]
  if (!pact || !pact.executedAt) return

  const receiptUrl = `${appUrl()}/pacts/${pactId}/receipt`

  for (const party of partyList.filter((p) => p.email)) {
    const html = await render(
      ExecutedEmail({
        pactTitle: pact.title,
        outcomeStatement: pact.outcomeStatement,
        executedAt: pact.executedAt.toISOString(),
        receiptUrl,
        executionHash,
      }),
    )

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: party.email,
      subject: `Pact executed: ${pact.title}`,
      html,
    })
  }
}
```

---

- [ ] **Step 17-6: Wire invite emails into submit route**

Full updated `app/api/pacts/[id]/submit/route.ts`:

```typescript
import { auth } from '@/auth'
import { submitPact } from '@/lib/db/queries/pacts'
import { sendInviteEmails } from '@/lib/email/send'
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

    // Fire invite emails after DB commit — non-blocking, best-effort
    void sendInviteEmails(pactId).catch(console.error)

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

- [ ] **Step 17-7: Wire fulfilled + execution emails into fulfil route**

Full updated `app/api/conditions/[id]/fulfil/route.ts`:

```typescript
import { auth } from '@/auth'
import { fulfilConditionByParty } from '@/lib/db/queries/conditions'
import { attemptPactExecution } from '@/lib/execution'
import { broadcastPactEvent } from '@/lib/sse'
import { sendFulfilledEmails, sendExecutionEmails } from '@/lib/email/send'
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
    const { pactId } = await fulfilConditionByParty(
      conditionId,
      session.user.id,
      session.user.name ?? null,
      parsed.data,
    )

    // Broadcast + email after fulfilment DB commit — all non-blocking, best-effort
    void broadcastPactEvent(pactId, {
      type: 'CONDITION_FULFILLED',
      conditionId,
      timestamp: new Date().toISOString(),
    }).catch(console.error)

    void sendFulfilledEmails(pactId, conditionId, session.user.id).catch(console.error)

    const { executed, executionHash } = await attemptPactExecution(
      pactId,
      session.user.id,
    )

    if (executed && executionHash) {
      void broadcastPactEvent(pactId, {
        type: 'PACT_EXECUTED',
        executedAt: new Date().toISOString(),
        executionHash,
      }).catch(console.error)

      void sendExecutionEmails(pactId, executionHash).catch(console.error)
    }

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

- [ ] **Step 17-8: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

- [ ] **Step 17-9: Commit**

```bash
git add lib/email/ \
  "app/api/pacts/[id]/submit/route.ts" \
  "app/api/conditions/[id]/fulfil/route.ts" && \
git commit -m "feat: Task 17 — Resend emails, invite + fulfilled + execution templates"
```

---

**⏸ CHECKPOINT 17 — Phase 3 complete.**

**Phase 3 Gate — all must be true:**
- [ ] `npx tsc --noEmit` — zero errors
- [ ] SSE stream endpoint responds at `GET /api/pacts/[id]/stream` with `text/event-stream`
- [ ] In two browsers simultaneously: Party A fulfils a condition → Party B sees update within ~1 second, no page reload
- [ ] When last condition fulfilled: both browsers see EXECUTED status + green banner simultaneously
- [ ] Dashboard loads at `/dashboard` with pact cards, status tabs, party avatars, progress bars
- [ ] Submit pact → invite emails arrive in counterparty inboxes (requires RESEND_API_KEY)
- [ ] Fulfil condition → fulfilled notification emails sent to other parties
- [ ] Pact executes → execution confirmation emails sent to all parties with receipt link

---

## Self-Review

| PRD Requirement | Task |
|---|---|
| F-07: SSE stream via Vercel KV (not in-memory) | 13 |
| F-07: `runtime = 'nodejs'` on SSE route | 13 |
| F-07: Auth check before subscribing | 13 |
| F-07: Client SSE hook with auto-reconnect | 14 |
| F-07: SSE events: PARTY_ACCEPTED, PACT_ACTIVATED, CONDITION_FULFILLED, PACT_EXECUTED | 14 |
| F-07: `window.location.reload()` removed, SSE drives updates | 14 |
| F-07: Broadcasts wired to accept + fulfil routes AFTER DB commit | 14 |
| Execution animation — status badge, banner, audit scroll | 15 |
| Transitions CSS only, no animation library | 15 |
| `#D4FF4F` accent on CTAs, `#22C55E` on execution | 15 |
| F-09: Dashboard with status filter tabs | 16 |
| F-09: Pact cards with party avatars + progress bar | 16 |
| F-09: Empty state with CTA | 16 |
| F-10: Invite email sent on submit (not create) | 17 |
| F-10: Fulfilled notification to OTHER parties | 17 |
| F-10: Execution email with receipt URL | 17 |
| Emails fire AFTER commit, never inside transaction | 17 |
| Email send is non-blocking (`void .catch`) | 17 |

**KV limitation noted:** `@vercel/kv` 3.0 has no pub/sub. Plan uses `rpush`/`lrange` list polling — cross-instance fan-out with ~1 s latency. This is architecturally sound and sufficient for the demo. If sub-second latency is needed post-hackathon, replace with a dedicated Redis instance or Pusher/Ably.
