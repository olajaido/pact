# Phase 4 — Visual Polish & Submission Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Next.js boilerplate with production-quality pages so judges see a polished product from the first URL — landing page, receipt, sign-in, create-pact form, and a working smoke test.

**Architecture:** All new pages are Server Components except `CreatePactForm` (Client Component for multi-step state) and the sign-in submit button (`useFormStatus`). Fonts are loaded via `next/font/google` in `layout.tsx` and exposed as CSS variables (`--font-heading` → DM Serif Display, `--font-sans` → IBM Plex Sans). All inline styles use the design system tokens from the PRD.

**Tech Stack:** Next.js 16 App Router · `next/font/google` · Auth.js v5 `signIn` Server Action · Drizzle ORM · React `useFormStatus` · inline CSS (no new libraries)

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `app/layout.tsx` | **Rewrite** | DM Serif Display + IBM Plex Sans fonts, correct metadata, dark body bg |
| `app/globals.css` | **Modify** | Fix `--font-heading: var(--font-heading)` (1 line) |
| `app/page.tsx` | **Rewrite** | Landing page — Hero, How It Works, Use Cases, CTA, Footer |
| `app/pacts/[id]/receipt/page.tsx` | **Create** | Public execution receipt — hash, parties, conditions, audit |
| `app/(auth)/sign-in/page.tsx` | **Create** | Magic link form with loading state |
| `components/SignInSubmitButton.tsx` | **Create** | Client Component using `useFormStatus` for pending state |
| `app/(auth)/verify/page.tsx` | **Create** | "Check your email" static page |
| `app/pacts/new/page.tsx` | **Create** | Thin Server Component — passes session email to CreatePactForm |
| `components/forms/CreatePactForm.tsx` | **Create** | Client Component — 5-step pact creation form |
| `.claude/skills/run-pact/smoke.sh` | **Modify** | Change grep from "To get started" to "Commitments" |

---

## ⚠️ Checkpoint Protocol

Stop after every task commit and wait for explicit approval before starting the next task.

---

## Task 18: Landing Page + Layout Update

**Files:**
- Rewrite: `app/layout.tsx`
- Modify: `app/globals.css` (1 line change)
- Rewrite: `app/page.tsx`

---

- [ ] **Step 18-1: Rewrite app/layout.tsx**

Switch from Geist to the PRD-specified fonts. Set dark body background. Update metadata.

```tsx
import type { Metadata } from 'next'
import { DM_Serif_Display, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'

const dmSerifDisplay = DM_Serif_Display({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})

const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Pact — Commitments that execute themselves',
  description:
    'Multi-party commitment execution platform. Define obligations, all parties fulfil them, the outcome fires atomically. Backed by Aurora DSQL distributed ACID transactions.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${dmSerifDisplay.variable} ${ibmPlexSans.variable}`}
    >
      <body style={{ background: '#0C0C0E', margin: 0, minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
```

---

- [ ] **Step 18-2: Fix globals.css — font-heading variable**

In `app/globals.css`, find line 11 which currently reads:
```css
  --font-heading: var(--font-sans);
```
Change it to:
```css
  --font-heading: var(--font-heading);
```

This makes the `font-heading` Tailwind utility point to the DM Serif Display CSS variable set by `next/font/google` instead of falling back to the sans font.

---

- [ ] **Step 18-3: Rewrite app/page.tsx — Landing page**

```tsx
export default function LandingPage() {
  return (
    <div
      style={{
        fontFamily: 'var(--font-sans), IBM Plex Sans, sans-serif',
        color: '#F0EFE8',
        background: '#0C0C0E',
      }}
    >
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 40px',
          height: 60,
          background: 'rgba(12,12,14,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #242428',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-heading), DM Serif Display, serif',
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
        >
          Pact
        </span>
        <a
          href="/sign-in"
          style={{
            color: '#F0EFE8',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Sign in
        </a>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '80px 32px 40px',
        }}
      >
        <p
          style={{
            color: '#D4FF4F',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.2em',
            marginBottom: 32,
            textTransform: 'uppercase',
          }}
        >
          AWS × Vercel Hackathon
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-heading), DM Serif Display, serif',
            fontSize: 'clamp(42px, 7vw, 80px)',
            fontWeight: 400,
            lineHeight: 1.05,
            margin: '0 0 28px',
            maxWidth: 720,
            letterSpacing: '-0.02em',
          }}
        >
          Commitments that<br />execute themselves.
        </h1>
        <p
          style={{
            color: '#6B7280',
            fontSize: 20,
            lineHeight: 1.6,
            maxWidth: 540,
            margin: '0 0 48px',
          }}
        >
          Define obligations. All parties fulfil them.
          The outcome fires atomically — permanent,
          auditable, simultaneous.
        </p>
        <a
          href="/sign-in"
          style={{
            background: '#D4FF4F',
            color: '#0C0C0E',
            padding: '16px 36px',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 16,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Start for free →
        </a>
        <p
          style={{
            color: '#6B7280',
            fontSize: 12,
            marginTop: 16,
          }}
        >
          No credit card required. Backed by Aurora DSQL.
        </p>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section
        style={{
          padding: '96px 40px',
          borderTop: '1px solid #242428',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <p
          style={{
            color: '#6B7280',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 48,
            textAlign: 'center',
          }}
        >
          How it works
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
          }}
        >
          {[
            {
              num: '01',
              title: 'Create',
              body: 'Define the pact: title, parties, and what each party must fulfil. Invite them with a single link.',
            },
            {
              num: '02',
              title: 'Commit',
              body: 'All parties accept their obligations. The pact activates only when every party has agreed.',
            },
            {
              num: '03',
              title: 'Execute',
              body: 'When the last condition is fulfilled, Aurora DSQL fires a single ACID transaction. The outcome is instant, permanent, and simultaneous for all parties.',
            },
          ].map((step) => (
            <div
              key={step.num}
              style={{
                background: '#141416',
                border: '1px solid #242428',
                padding: 32,
              }}
            >
              <p
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#D4FF4F',
                  fontSize: 12,
                  fontWeight: 700,
                  margin: '0 0 16px',
                  letterSpacing: '0.1em',
                }}
              >
                {step.num}
              </p>
              <h3
                style={{
                  fontFamily: 'var(--font-heading), DM Serif Display, serif',
                  fontSize: 28,
                  fontWeight: 400,
                  margin: '0 0 16px',
                  color: '#F0EFE8',
                }}
              >
                {step.title}
              </h3>
              <p style={{ color: '#6B7280', lineHeight: 1.7, margin: 0, fontSize: 15 }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Use cases ────────────────────────────────────── */}
      <section
        style={{
          padding: '96px 40px',
          borderTop: '1px solid #242428',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <p
          style={{
            color: '#6B7280',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 48,
            textAlign: 'center',
          }}
        >
          Built for
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {[
            {
              label: 'Freelancers',
              headline: 'No more "did you accept this?"',
              body: 'Submit your deliverable. Client accepts. Both parties mark complete. Dispute-proof audit trail included.',
              example: 'Submit design files → Client accepts → Project closes',
            },
            {
              label: 'Vendors',
              headline: 'From delivery to invoice in one step',
              body: 'Vendor confirms shipment. Buyer confirms receipt. Invoice is automatically approved.',
              example: 'Confirm shipment → Buyer confirms → Invoice approved',
            },
            {
              label: 'Partnerships',
              headline: 'Both sides committed, or it does not activate',
              body: 'Two business partners both commit to a joint campaign. Agreement activates only when everyone is in.',
              example: 'Agency reaches milestone → Client signs off → Next phase unlocks',
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: '#141416',
                border: '1px solid #242428',
                borderRadius: 8,
                padding: 28,
              }}
            >
              <p
                style={{
                  color: '#D4FF4F',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  margin: '0 0 12px',
                }}
              >
                {card.label}
              </p>
              <h3
                style={{
                  fontFamily: 'var(--font-heading), DM Serif Display, serif',
                  fontSize: 22,
                  fontWeight: 400,
                  margin: '0 0 12px',
                  lineHeight: 1.3,
                }}
              >
                {card.headline}
              </h3>
              <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
                {card.body}
              </p>
              <p
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  color: '#22C55E',
                  background: 'rgba(34,197,94,0.08)',
                  padding: '8px 12px',
                  borderRadius: 4,
                  margin: 0,
                }}
              >
                {card.example}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────── */}
      <section
        style={{
          borderTop: '1px solid #242428',
          padding: '96px 40px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-heading), DM Serif Display, serif',
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 400,
            margin: '0 0 24px',
            letterSpacing: '-0.02em',
          }}
        >
          Replace the email chain.
        </h2>
        <p style={{ color: '#6B7280', fontSize: 18, margin: '0 0 40px' }}>
          One link. Both sides committed. Automatic execution.
        </p>
        <a
          href="/sign-in"
          style={{
            background: '#D4FF4F',
            color: '#0C0C0E',
            padding: '16px 36px',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 16,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Create your first Pact →
        </a>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid #242428',
          padding: '32px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#6B7280',
          fontSize: 13,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-heading), DM Serif Display, serif',
            fontSize: 18,
          }}
        >
          Pact
        </span>
        <span>
          Built on{' '}
          <strong style={{ color: '#F0EFE8' }}>Aurora DSQL</strong>
          {' '}· Deployed on{' '}
          <strong style={{ color: '#F0EFE8' }}>Vercel</strong>
        </span>
        <span>AWS × Vercel H0 Hackathon</span>
      </footer>
    </div>
  )
}
```

---

- [ ] **Step 18-4: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

- [ ] **Step 18-5: Commit**

```bash
git add app/layout.tsx app/globals.css app/page.tsx && \
git commit -m "feat: Task 18 — landing page, DM Serif Display + IBM Plex Sans fonts, dark theme"
```

---

**⏸ CHECKPOINT 18 — Stop here.**

Visual check: `npm run dev` → open `http://localhost:3000`. Must see:
- Dark background `#0C0C0E` immediately (no flash of white)
- "Commitments that execute themselves." headline in DM Serif Display
- Chartreuse `#D4FF4F` accent on "AWS × Vercel Hackathon" label and CTA button
- Three "How it works" columns side by side
- Three use case cards
- Footer with Pact wordmark

---

## Task 19: Execution Receipt Page

**Files:**
- Create: `app/pacts/[id]/receipt/page.tsx`

The receipt page is publicly accessible (middleware already marks `/pacts/*/receipt` as public). It queries the pact, parties (names only — no emails), conditions with fulfilment notes, and the execution hash from the `executions` table.

---

- [ ] **Step 19-1: Create app/pacts/[id]/receipt/page.tsx**

```tsx
import { db } from '@/lib/db'
import {
  pacts,
  parties,
  conditions,
  conditionFulfilments,
  executions,
  auditLog,
} from '@/lib/db/schema'
import { eq, asc, desc } from 'drizzle-orm'
import { notFound } from 'next/navigation'

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [pact] = await db.select().from(pacts).where(eq(pacts.id, id)).limit(1)

  if (!pact) notFound()

  if (pact.status !== 'EXECUTED') {
    return (
      <main style={mainStyle}>
        <p style={{ color: '#6B7280', textAlign: 'center', marginTop: 80 }}>
          This Pact has not been executed yet.
        </p>
      </main>
    )
  }

  // Fetch all data in parallel
  const [partyList, conditionsWithFulfilments, executionRow, lastAudit] =
    await Promise.all([
      db.select().from(parties).where(eq(parties.pactId, id)),

      db
        .select({ condition: conditions, fulfilment: conditionFulfilments })
        .from(conditions)
        .leftJoin(
          conditionFulfilments,
          eq(conditionFulfilments.conditionId, conditions.id),
        )
        .where(eq(conditions.pactId, id))
        .orderBy(asc(conditions.displayOrder)),

      db
        .select()
        .from(executions)
        .where(eq(executions.pactId, id))
        .limit(1),

      db
        .select({ entryHash: auditLog.entryHash, createdAt: auditLog.createdAt })
        .from(auditLog)
        .where(eq(auditLog.pactId, id))
        .orderBy(desc(auditLog.createdAt))
        .limit(1),
    ])

  const execution = executionRow[0]
  const executionHash = execution?.executionHash ?? lastAudit[0]?.entryHash ?? 'N/A'

  return (
    <div style={{ background: '#0C0C0E', minHeight: '100vh', padding: '0 0 64px' }}>
      {/* Header bar */}
      <div
        style={{
          background: '#22C55E',
          padding: '12px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-heading), DM Serif Display, serif',
            fontSize: 18,
            fontWeight: 400,
            color: '#0C0C0E',
          }}
        >
          Pact
        </span>
        <span
          style={{
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#0C0C0E',
          }}
        >
          Execution Receipt
        </span>
      </div>

      {/* Main content */}
      <main style={mainStyle}>
        {/* Title + timestamp */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              background: '#22C55E',
              color: '#0C0C0E',
              padding: '4px 14px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            Executed
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-heading), DM Serif Display, serif',
              fontSize: 36,
              fontWeight: 400,
              margin: '0 0 16px',
              color: '#F0EFE8',
            }}
          >
            {pact.title}
          </h1>
          {pact.executedAt && (
            <p style={{ color: '#6B7280', fontSize: 14 }}>
              Executed on{' '}
              <strong style={{ color: '#F0EFE8' }}>
                {new Date(pact.executedAt).toLocaleString('en-GB', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </strong>
            </p>
          )}
        </div>

        {/* Outcome */}
        <div style={cardStyle}>
          <p style={labelStyle}>Outcome Achieved</p>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>
            {pact.outcomeStatement}
          </p>
        </div>

        {/* Parties — names only, no emails */}
        <div style={cardStyle}>
          <p style={labelStyle}>Parties</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {partyList.map((party) => (
              <span
                key={party.id}
                style={{
                  background: '#242428',
                  color: '#F0EFE8',
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {party.displayName ?? 'Party'}
                <span style={{ color: '#6B7280', marginLeft: 6, fontSize: 12 }}>
                  {party.role === 'CREATOR' ? 'creator' : 'participant'}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Conditions */}
        <div style={cardStyle}>
          <p style={labelStyle}>Conditions Fulfilled</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {conditionsWithFulfilments.map(({ condition, fulfilment }) => (
              <div
                key={condition.id}
                style={{
                  borderLeft: '3px solid #22C55E',
                  paddingLeft: 16,
                }}
              >
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>
                  {condition.title}
                </p>
                {fulfilment?.note && (
                  <p
                    style={{
                      margin: '4px 0 0',
                      color: '#6B7280',
                      fontSize: 13,
                    }}
                  >
                    Note: {fulfilment.note}
                  </p>
                )}
                {fulfilment?.referenceUrl && (
                  <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                    <a
                      href={fulfilment.referenceUrl}
                      style={{ color: '#D4FF4F' }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {fulfilment.referenceUrl}
                    </a>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Execution fingerprint */}
        <div style={cardStyle}>
          <p style={labelStyle}>Execution Fingerprint</p>
          <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 12px' }}>
            SHA-256 hash of the execution payload. This value is immutable.
            Each entry in the audit log hashes the previous — altering any
            entry invalidates every subsequent hash.
          </p>
          <code
            style={{
              display: 'block',
              fontFamily: 'JetBrains Mono, Menlo, monospace',
              fontSize: 13,
              color: '#22C55E',
              background: 'rgba(34,197,94,0.06)',
              padding: '12px 16px',
              borderRadius: 6,
              wordBreak: 'break-all',
              lineHeight: 1.6,
            }}
          >
            {executionHash}
          </code>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 48,
            paddingTop: 32,
            borderTop: '1px solid #242428',
          }}
        >
          <p style={{ color: '#6B7280', fontSize: 13 }}>
            Built with{' '}
            <a href="/" style={{ color: '#D4FF4F', textDecoration: 'none', fontWeight: 600 }}>
              Pact
            </a>{' '}
            — programmable commitments, backed by Aurora DSQL
          </p>
        </div>
      </main>
    </div>
  )
}

// ─── Shared styles ───────────────────────────────────────────

const mainStyle: React.CSSProperties = {
  maxWidth: 700,
  margin: '0 auto',
  padding: '48px 32px',
  fontFamily: 'var(--font-sans), IBM Plex Sans, sans-serif',
  color: '#F0EFE8',
}

const cardStyle: React.CSSProperties = {
  background: '#141416',
  border: '1px solid #242428',
  borderRadius: 8,
  padding: 24,
  marginBottom: 16,
}

const labelStyle: React.CSSProperties = {
  color: '#6B7280',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  margin: '0 0 16px',
}
```

---

- [ ] **Step 19-2: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

- [ ] **Step 19-3: Commit**

```bash
git add "app/pacts/[id]/receipt/page.tsx" && \
git commit -m "feat: Task 19 — public execution receipt page with hash fingerprint"
```

---

**⏸ CHECKPOINT 19 — Stop here.**

Verify: Navigate to `http://localhost:3000/pacts/<EXECUTED_PACT_ID>/receipt` in an incognito window (no session). Must load without auth redirect. Should show parties (names only), conditions, execution hash in green monospace.

---

## Task 20: Sign-in + Verify Pages

**Files:**
- Create: `components/SignInSubmitButton.tsx`
- Create: `app/(auth)/sign-in/page.tsx`
- Create: `app/(auth)/verify/page.tsx`

The sign-in page calls `signIn('resend', { email, redirectTo })` via a Server Action. Auth.js sends the magic link via Resend and redirects to `/verify`. The submit button uses `useFormStatus` for a loading indicator.

---

- [ ] **Step 20-1: Create components/SignInSubmitButton.tsx**

Client Component used inside the sign-in `<form>` to show pending state without making the whole page a Client Component.

```tsx
'use client'

import { useFormStatus } from 'react-dom'

export function SignInSubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: '100%',
        background: pending ? '#242428' : '#D4FF4F',
        color: pending ? '#6B7280' : '#0C0C0E',
        padding: '14px 24px',
        border: 'none',
        borderRadius: 6,
        fontWeight: 700,
        fontSize: 15,
        cursor: pending ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s ease, color 0.15s ease',
        fontFamily: 'inherit',
      }}
    >
      {pending ? 'Sending…' : 'Send magic link'}
    </button>
  )
}
```

---

- [ ] **Step 20-2: Create app/(auth)/sign-in/page.tsx**

Server Component page. The inline Server Action calls `signIn('resend', ...)`, which on success redirects the user to `/verify` (our custom verify page, defined in `auth.ts` as `pages.verifyRequest`). On Resend failure, Auth.js throws — in that case we redirect to `/sign-in?error=true`.

```tsx
import { signIn } from '@/auth'
import { redirect } from 'next/navigation'
import { SignInSubmitButton } from '@/components/SignInSubmitButton'

async function handleSignIn(formData: FormData) {
  'use server'
  const email = (formData.get('email') as string | null)?.trim()
  if (!email) return

  try {
    await signIn('resend', { email, redirectTo: '/dashboard' })
  } catch (err: unknown) {
    // Re-throw Next.js redirect errors so navigation works
    const digest = (err as { digest?: string })?.digest
    if (digest?.startsWith('NEXT_REDIRECT')) throw err
    // For real failures (Resend down, etc.), show error on page
    redirect('/sign-in?error=true')
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>
}) {
  const { error } = await searchParams

  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
        fontFamily: 'var(--font-sans), IBM Plex Sans, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1
            style={{
              fontFamily: 'var(--font-heading), DM Serif Display, serif',
              fontSize: 36,
              fontWeight: 400,
              color: '#F0EFE8',
              margin: '0 0 8px',
            }}
          >
            Pact
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
            Commitments that execute themselves.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#141416',
            border: '1px solid #242428',
            borderRadius: 8,
            padding: 32,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#F0EFE8',
              margin: '0 0 8px',
            }}
          >
            Sign in
          </h2>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 24px' }}>
            Enter your email — we&apos;ll send a magic link.
            No password needed.
          </p>

          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 6,
                padding: '10px 14px',
                marginBottom: 20,
                color: '#EF4444',
                fontSize: 13,
              }}
            >
              Could not send magic link. Please check your email and try again.
            </div>
          )}

          <form action={handleSignIn}>
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#F0EFE8',
                  marginBottom: 6,
                }}
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  background: '#0C0C0E',
                  border: '1px solid #242428',
                  borderRadius: 6,
                  padding: '12px 14px',
                  color: '#F0EFE8',
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <SignInSubmitButton />
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 13, marginTop: 24 }}>
          By signing in you agree to the{' '}
          <span style={{ color: '#F0EFE8' }}>terms of service</span>.
        </p>
      </div>
    </main>
  )
}
```

---

- [ ] **Step 20-3: Create app/(auth)/verify/page.tsx**

Static page shown after the magic link email is sent. The user sees this while waiting to click the link in their inbox.

```tsx
export default function VerifyPage() {
  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
        fontFamily: 'var(--font-sans), IBM Plex Sans, sans-serif',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 440 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(212,255,79,0.1)',
            border: '2px solid #D4FF4F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px',
            fontSize: 24,
          }}
        >
          ✓
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-heading), DM Serif Display, serif',
            fontSize: 32,
            fontWeight: 400,
            color: '#F0EFE8',
            margin: '0 0 16px',
          }}
        >
          Check your email
        </h1>
        <p style={{ color: '#6B7280', fontSize: 16, lineHeight: 1.6, margin: '0 0 32px' }}>
          We sent a magic link to your inbox. Click the link
          to sign in — it expires in 10 minutes.
        </p>

        <div
          style={{
            background: '#141416',
            border: '1px solid #242428',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 32,
          }}
        >
          <p style={{ color: '#6B7280', fontSize: 13, margin: 0 }}>
            No email? Check your spam folder, or{' '}
            <a href="/sign-in" style={{ color: '#D4FF4F', textDecoration: 'none' }}>
              try again with a different address
            </a>
            .
          </p>
        </div>

        <a
          href="/"
          style={{
            color: '#6B7280',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          ← Back to Pact
        </a>
      </div>
    </main>
  )
}
```

---

- [ ] **Step 20-4: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

- [ ] **Step 20-5: Commit**

```bash
git add components/SignInSubmitButton.tsx \
  "app/(auth)/sign-in/page.tsx" \
  "app/(auth)/verify/page.tsx" && \
git commit -m "feat: Task 20 — sign-in page, verify page, SignInSubmitButton"
```

---

**⏸ CHECKPOINT 20 — Stop here.**

Visual check at `http://localhost:3000/sign-in`:
- Dark card, "Pact" heading, "Sign in" subheading
- Email input with dark styling
- "Send magic link" button in chartreuse
- While form submitting: button shows "Sending…" in grey (no chartreuse)

---

## Task 21: Create Pact Page — Multi-step Form

**Files:**
- Create: `components/forms/CreatePactForm.tsx` — Client Component with all 5-step logic
- Create: `app/pacts/new/page.tsx` — thin Server Component (passes session email)

The form collects: pact basics → counterparties → per-party conditions → review → submission result. On submit it calls `POST /api/pacts` then `POST /api/pacts/{id}/submit`. Step 5 shows invite links for each counterparty.

---

- [ ] **Step 21-1: Create components/forms/CreatePactForm.tsx**

```bash
mkdir -p /Users/olajideadeluwoye/Desktop/pact/pact/components/forms
```

```tsx
'use client'

import { useState } from 'react'

// ─── Types ───────────────────────────────────────────────────

interface Counterparty {
  email: string
  name: string
  conditions: Array<{ title: string; description: string }>
}

interface FormState {
  step: 1 | 2 | 3 | 4 | 5
  // Step 1
  title: string
  description: string
  outcomeStatement: string
  // Step 2
  counterparties: Counterparty[]
  // Step 3 — creator conditions
  creatorConditions: Array<{ title: string; description: string }>
  // Result (Step 5)
  pactId: string
  resultParties: Array<{ email: string; inviteToken: string; role: string; displayName: string | null }>
  error: string | null
  loading: boolean
}

function emptyCondition() {
  return { title: '', description: '' }
}

function emptyCounterparty(): Counterparty {
  return { email: '', name: '', conditions: [emptyCondition()] }
}

const STEP_LABELS = ['Basics', 'Parties', 'Conditions', 'Review', 'Sent'] as const

// ─── Component ───────────────────────────────────────────────

interface Props {
  creatorEmail: string
  creatorName: string
}

export function CreatePactForm({ creatorEmail, creatorName }: Props) {
  const [state, setState] = useState<FormState>({
    step: 1,
    title: '',
    description: '',
    outcomeStatement: '',
    counterparties: [emptyCounterparty()],
    creatorConditions: [emptyCondition()],
    pactId: '',
    resultParties: [],
    error: null,
    loading: false,
  })

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  // ── Step navigation ────────────────────────────────────────

  function canAdvanceStep1() {
    return state.title.trim().length > 0 && state.outcomeStatement.trim().length > 0
  }

  function canAdvanceStep2() {
    return state.counterparties.every(
      (cp) => cp.email.trim().length > 0 && cp.name.trim().length > 0,
    )
  }

  function canAdvanceStep3() {
    const creatorOk = state.creatorConditions.every((c) => c.title.trim().length > 0)
    const counterOk = state.counterparties.every((cp) =>
      cp.conditions.every((c) => c.title.trim().length > 0),
    )
    return creatorOk && counterOk
  }

  function advance() {
    setState((prev) => ({ ...prev, step: (prev.step + 1) as FormState['step'] }))
  }

  function back() {
    setState((prev) => ({
      ...prev,
      step: (prev.step - 1) as FormState['step'],
      error: null,
    }))
  }

  // ── Counterparty helpers ───────────────────────────────────

  function updateCounterparty(index: number, patch: Partial<Counterparty>) {
    setState((prev) => ({
      ...prev,
      counterparties: prev.counterparties.map((cp, i) =>
        i === index ? { ...cp, ...patch } : cp,
      ),
    }))
  }

  function updateCpCondition(
    cpIndex: number,
    condIndex: number,
    patch: Partial<{ title: string; description: string }>,
  ) {
    setState((prev) => ({
      ...prev,
      counterparties: prev.counterparties.map((cp, i) =>
        i === cpIndex
          ? {
              ...cp,
              conditions: cp.conditions.map((c, j) =>
                j === condIndex ? { ...c, ...patch } : c,
              ),
            }
          : cp,
      ),
    }))
  }

  function addCpCondition(cpIndex: number) {
    setState((prev) => ({
      ...prev,
      counterparties: prev.counterparties.map((cp, i) =>
        i === cpIndex
          ? { ...cp, conditions: [...cp.conditions, emptyCondition()] }
          : cp,
      ),
    }))
  }

  function removeCpCondition(cpIndex: number, condIndex: number) {
    setState((prev) => ({
      ...prev,
      counterparties: prev.counterparties.map((cp, i) =>
        i === cpIndex
          ? { ...cp, conditions: cp.conditions.filter((_, j) => j !== condIndex) }
          : cp,
      ),
    }))
  }

  // ── Creator condition helpers ──────────────────────────────

  function updateCreatorCondition(
    index: number,
    patch: Partial<{ title: string; description: string }>,
  ) {
    setState((prev) => ({
      ...prev,
      creatorConditions: prev.creatorConditions.map((c, i) =>
        i === index ? { ...c, ...patch } : c,
      ),
    }))
  }

  function addCreatorCondition() {
    setState((prev) => ({
      ...prev,
      creatorConditions: [...prev.creatorConditions, emptyCondition()],
    }))
  }

  function removeCreatorCondition(index: number) {
    setState((prev) => ({
      ...prev,
      creatorConditions: prev.creatorConditions.filter((_, i) => i !== index),
    }))
  }

  // ── Submission ─────────────────────────────────────────────

  async function handleSubmit() {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      // Build parties array: creator first, then counterparties
      const partiesPayload = [
        {
          email: creatorEmail,
          name: creatorName || 'You',
          conditions: state.creatorConditions.filter((c) => c.title.trim()),
        },
        ...state.counterparties.map((cp) => ({
          email: cp.email.trim(),
          name: cp.name.trim(),
          conditions: cp.conditions.filter((c) => c.title.trim()),
        })),
      ]

      // Step 1: Create pact
      const createRes = await fetch('/api/pacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: state.title.trim(),
          description: state.description.trim() || undefined,
          outcomeStatement: state.outcomeStatement.trim(),
          parties: partiesPayload,
        }),
      })

      if (!createRes.ok) {
        const err = (await createRes.json()) as { error?: string }
        throw new Error(err.error ?? 'Failed to create pact')
      }

      const created = (await createRes.json()) as {
        pact: { id: string }
        parties: Array<{ email: string; inviteToken: string; role: string; displayName: string | null }>
      }
      const pactId = created.pact.id

      // Step 2: Submit (DRAFT → PENDING_ACCEPTANCE, sends invites)
      const submitRes = await fetch(`/api/pacts/${pactId}/submit`, {
        method: 'POST',
      })

      if (!submitRes.ok) {
        const err = (await submitRes.json()) as { error?: string }
        throw new Error(err.error ?? 'Failed to submit pact')
      }

      setState((prev) => ({
        ...prev,
        pactId,
        resultParties: created.parties,
        loading: false,
        step: 5,
      }))
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Something went wrong',
      }))
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans), IBM Plex Sans, sans-serif',
        color: '#F0EFE8',
        maxWidth: 680,
        margin: '0 auto',
        padding: '48px 32px',
      }}
    >
      {/* Step indicator */}
      {state.step < 5 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 48,
          }}
        >
          {STEP_LABELS.slice(0, 4).map((label, i) => {
            const stepNum = (i + 1) as 1 | 2 | 3 | 4
            const isActive = state.step === stepNum
            const isDone = state.step > stepNum
            return (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: isDone ? '#22C55E' : isActive ? '#D4FF4F' : '#242428',
                    color: isDone || isActive ? '#0C0C0E' : '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {isDone ? '✓' : stepNum}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#F0EFE8' : '#6B7280',
                  }}
                >
                  {label}
                </span>
                {i < 3 && (
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: '#242428',
                      marginLeft: 4,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Step 1: Basics ──────────────────────────────────── */}
      {state.step === 1 && (
        <div>
          <h2 style={stepHeading}>Start with the essentials</h2>
          <p style={stepSubtext}>Name the pact and describe what success looks like.</p>

          <div style={fieldGroup}>
            <label style={fieldLabel}>Pact title *</label>
            <input
              style={inputStyle}
              placeholder="e.g. Website Redesign — Final Delivery"
              value={state.title}
              maxLength={200}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <div style={fieldGroup}>
            <label style={fieldLabel}>Description (optional)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              placeholder="Context about this agreement..."
              value={state.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div style={fieldGroup}>
            <label style={fieldLabel}>Outcome statement *</label>
            <input
              style={inputStyle}
              placeholder="e.g. Both parties confirm project complete and payment approved"
              value={state.outcomeStatement}
              onChange={(e) => set('outcomeStatement', e.target.value)}
            />
            <p style={fieldHint}>
              This is what the pact represents when executed — one sentence.
            </p>
          </div>

          <button
            style={primaryBtn}
            disabled={!canAdvanceStep1()}
            onClick={advance}
          >
            Next: Add parties →
          </button>
        </div>
      )}

      {/* ── Step 2: Parties ─────────────────────────────────── */}
      {state.step === 2 && (
        <div>
          <h2 style={stepHeading}>Who&apos;s involved?</h2>
          <p style={stepSubtext}>
            Add the other parties. You are automatically Party 1.
          </p>

          {/* Creator — read-only */}
          <div
            style={{
              background: '#141416',
              border: '1px solid #242428',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
              Party 1 — You (creator)
            </p>
            <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{creatorName || creatorEmail}</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6B7280' }}>{creatorEmail}</p>
          </div>

          {state.counterparties.map((cp, i) => (
            <div
              key={i}
              style={{
                background: '#141416',
                border: '1px solid #242428',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
                Party {i + 2}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ ...fieldLabel, display: 'block', marginBottom: 4 }}>Name *</label>
                  <input
                    style={inputStyle}
                    placeholder="Sarah Chen"
                    value={cp.name}
                    onChange={(e) => updateCounterparty(i, { name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ ...fieldLabel, display: 'block', marginBottom: 4 }}>Email *</label>
                  <input
                    style={inputStyle}
                    type="email"
                    placeholder="sarah@example.com"
                    value={cp.email}
                    onChange={(e) => updateCounterparty(i, { email: e.target.value })}
                  />
                </div>
              </div>
              {state.counterparties.length > 1 && (
                <button
                  style={ghostBtn}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      counterparties: prev.counterparties.filter((_, j) => j !== i),
                    }))
                  }
                >
                  Remove party
                </button>
              )}
            </div>
          ))}

          {state.counterparties.length < 4 && (
            <button
              style={ghostBtn}
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  counterparties: [...prev.counterparties, emptyCounterparty()],
                }))
              }
            >
              + Add another party
            </button>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button style={backBtn} onClick={back}>← Back</button>
            <button style={primaryBtn} disabled={!canAdvanceStep2()} onClick={advance}>
              Next: Define conditions →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Conditions ──────────────────────────────── */}
      {state.step === 3 && (
        <div>
          <h2 style={stepHeading}>What does each party need to do?</h2>
          <p style={stepSubtext}>
            Add at least one condition per party. The pact executes when all conditions are fulfilled.
          </p>

          {/* Creator conditions */}
          <ConditionsBlock
            partyLabel={`Your conditions (${creatorName || creatorEmail})`}
            conditions={state.creatorConditions}
            onUpdate={(i, patch) => updateCreatorCondition(i, patch)}
            onAdd={addCreatorCondition}
            onRemove={(i) => removeCreatorCondition(i)}
          />

          {/* Counterparty conditions */}
          {state.counterparties.map((cp, cpIdx) => (
            <ConditionsBlock
              key={cpIdx}
              partyLabel={`${cp.name || cp.email}'s conditions`}
              conditions={cp.conditions}
              onUpdate={(condIdx, patch) => updateCpCondition(cpIdx, condIdx, patch)}
              onAdd={() => addCpCondition(cpIdx)}
              onRemove={(condIdx) => removeCpCondition(cpIdx, condIdx)}
            />
          ))}

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button style={backBtn} onClick={back}>← Back</button>
            <button style={primaryBtn} disabled={!canAdvanceStep3()} onClick={advance}>
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Review ──────────────────────────────────── */}
      {state.step === 4 && (
        <div>
          <h2 style={stepHeading}>Ready to send?</h2>
          <p style={stepSubtext}>
            Review everything before sending invites. You cannot edit after submission.
          </p>

          <div style={reviewCard}>
            <p style={reviewLabel}>Pact</p>
            <p style={{ fontWeight: 600, fontSize: 18, margin: '0 0 4px' }}>{state.title}</p>
            {state.description && <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>{state.description}</p>}
            <p style={{ color: '#6B7280', fontSize: 14, margin: '8px 0 0' }}>
              <strong style={{ color: '#F0EFE8' }}>Outcome:</strong> {state.outcomeStatement}
            </p>
          </div>

          {/* Creator */}
          <div style={reviewCard}>
            <p style={reviewLabel}>Parties & Conditions</p>
            <ReviewParty
              name={creatorName || 'You'}
              email={creatorEmail}
              role="CREATOR"
              conditions={state.creatorConditions}
            />
            {state.counterparties.map((cp, i) => (
              <ReviewParty
                key={i}
                name={cp.name}
                email={cp.email}
                role="PARTICIPANT"
                conditions={cp.conditions}
              />
            ))}
          </div>

          {state.error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 6,
                padding: '12px 16px',
                marginBottom: 20,
                color: '#EF4444',
                fontSize: 14,
              }}
            >
              {state.error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button style={backBtn} onClick={back} disabled={state.loading}>← Back</button>
            <button
              style={{ ...primaryBtn, opacity: state.loading ? 0.6 : 1 }}
              disabled={state.loading}
              onClick={handleSubmit}
            >
              {state.loading ? 'Creating pact…' : 'Submit and send invites →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Sent ────────────────────────────────────── */}
      {state.step === 5 && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(212,255,79,0.1)',
              border: '2px solid #D4FF4F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 32px',
              fontSize: 28,
            }}
          >
            ✓
          </div>
          <h2 style={{ ...stepHeading, textAlign: 'center' }}>Pact created!</h2>
          <p style={{ ...stepSubtext, textAlign: 'center' }}>
            Invites have been sent. Share these links if email is not configured.
          </p>

          <div style={{ textAlign: 'left', marginBottom: 32 }}>
            {state.resultParties
              .filter((p) => p.role === 'PARTICIPANT')
              .map((p) => (
                <div
                  key={p.email}
                  style={{
                    background: '#141416',
                    border: '1px solid #242428',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 8,
                  }}
                >
                  <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
                    {p.displayName ?? p.email}
                  </p>
                  <code
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: '#D4FF4F',
                      background: 'rgba(212,255,79,0.06)',
                      padding: '8px 12px',
                      borderRadius: 4,
                      wordBreak: 'break-all',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/pacts/${state.pactId}/accept?token=${p.inviteToken}`
                      : `/pacts/${state.pactId}/accept?token=${p.inviteToken}`}
                  </code>
                </div>
              ))}
          </div>

          <a
            href={`/pacts/${state.pactId}`}
            style={{
              ...primaryBtn,
              display: 'inline-block',
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            View Pact →
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

interface ConditionsBlockProps {
  partyLabel: string
  conditions: Array<{ title: string; description: string }>
  onUpdate: (index: number, patch: Partial<{ title: string; description: string }>) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

function ConditionsBlock({
  partyLabel,
  conditions,
  onUpdate,
  onAdd,
  onRemove,
}: ConditionsBlockProps) {
  return (
    <div
      style={{
        background: '#141416',
        border: '1px solid #242428',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
        {partyLabel}
      </p>
      {conditions.map((cond, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Condition title *"
              value={cond.title}
              onChange={(e) => onUpdate(i, { title: e.target.value })}
            />
            {conditions.length > 1 && (
              <button
                style={{ ...ghostBtn, marginTop: 0, padding: '10px 12px' }}
                onClick={() => onRemove(i)}
              >
                ✕
              </button>
            )}
          </div>
          <input
            style={{ ...inputStyle, marginTop: 6 }}
            placeholder="Description (optional)"
            value={cond.description}
            onChange={(e) => onUpdate(i, { description: e.target.value })}
          />
        </div>
      ))}
      <button style={ghostBtn} onClick={onAdd}>
        + Add condition
      </button>
    </div>
  )
}

interface ReviewPartyProps {
  name: string
  email: string
  role: string
  conditions: Array<{ title: string; description: string }>
}

function ReviewParty({ name, email, role, conditions }: ReviewPartyProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>{name}</span>
        <span style={{ color: '#6B7280', fontSize: 12 }}>{email}</span>
        {role === 'CREATOR' && (
          <span style={{ background: '#242428', color: '#6B7280', padding: '2px 8px', borderRadius: 999, fontSize: 11 }}>
            you
          </span>
        )}
      </div>
      {conditions.filter((c) => c.title.trim()).map((c, i) => (
        <div
          key={i}
          style={{
            borderLeft: '2px solid #242428',
            paddingLeft: 12,
            marginLeft: 4,
            marginBottom: 6,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{c.title}</p>
          {c.description && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>{c.description}</p>}
        </div>
      ))}
    </div>
  )
}

// ─── Shared styles ───────────────────────────────────────────

const stepHeading: React.CSSProperties = {
  fontFamily: 'var(--font-heading), DM Serif Display, serif',
  fontSize: 28,
  fontWeight: 400,
  margin: '0 0 8px',
  color: '#F0EFE8',
}

const stepSubtext: React.CSSProperties = {
  color: '#6B7280',
  fontSize: 15,
  margin: '0 0 32px',
  lineHeight: 1.5,
}

const fieldGroup: React.CSSProperties = { marginBottom: 20 }

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#F0EFE8',
  marginBottom: 6,
}

const fieldHint: React.CSSProperties = {
  color: '#6B7280',
  fontSize: 12,
  margin: '6px 0 0',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#141416',
  border: '1px solid #242428',
  borderRadius: 6,
  padding: '11px 14px',
  color: '#F0EFE8',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const primaryBtn: React.CSSProperties = {
  background: '#D4FF4F',
  color: '#0C0C0E',
  padding: '12px 24px',
  border: 'none',
  borderRadius: 6,
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const backBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#6B7280',
  padding: '12px 20px',
  border: '1px solid #242428',
  borderRadius: 6,
  fontWeight: 500,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#6B7280',
  padding: '8px 0',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'inherit',
  marginTop: 4,
}

const reviewCard: React.CSSProperties = {
  background: '#141416',
  border: '1px solid #242428',
  borderRadius: 8,
  padding: 20,
  marginBottom: 12,
}

const reviewLabel: React.CSSProperties = {
  color: '#6B7280',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  margin: '0 0 12px',
}
```

---

- [ ] **Step 21-2: Create app/pacts/new/page.tsx**

```tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { CreatePactForm } from '@/components/forms/CreatePactForm'

export default async function NewPactPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')

  return (
    <div
      style={{
        background: '#0C0C0E',
        minHeight: '100vh',
      }}
    >
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 32px',
          height: 56,
          borderBottom: '1px solid #242428',
        }}
      >
        <a
          href="/dashboard"
          style={{
            fontFamily: 'var(--font-heading), DM Serif Display, serif',
            fontSize: 20,
            color: '#F0EFE8',
            textDecoration: 'none',
          }}
        >
          Pact
        </a>
        <a href="/dashboard" style={{ color: '#6B7280', fontSize: 13, textDecoration: 'none' }}>
          ← Dashboard
        </a>
      </nav>
      <CreatePactForm
        creatorEmail={session.user.email!}
        creatorName={session.user.name ?? session.user.email ?? ''}
      />
    </div>
  )
}
```

---

- [ ] **Step 21-3: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

- [ ] **Step 21-4: Commit**

```bash
git add components/forms/CreatePactForm.tsx app/pacts/new/page.tsx && \
git commit -m "feat: Task 21 — Create Pact 5-step form, submit to API, show invite links"
```

---

**⏸ CHECKPOINT 21 — Stop here.**

End-to-end form test:
1. Sign in → navigate to `/pacts/new`
2. Step 1: fill title + outcome statement → click Next
3. Step 2: add one counterparty with email + name → click Next
4. Step 3: add conditions for yourself and the counterparty → click Next
5. Step 4: review everything → click "Submit and send invites"
6. Step 5: see invite links for the counterparty and "View Pact" button
7. Click "View Pact" → pact detail page shows with PENDING_ACCEPTANCE status

---

## Task 22: Update Smoke Test

**Files:**
- Modify: `.claude/skills/run-pact/smoke.sh`

The smoke test currently checks for `"To get started"` in the landing page body. After Task 18, that text is gone — replaced with the real landing page content. The check must use text that will actually appear.

---

- [ ] **Step 22-1: Update smoke test grep text**

In `.claude/skills/run-pact/smoke.sh`, find the line:

```bash
check "home"       "${BASE}/"           200  "To get started"
```

Replace it with:

```bash
check "home"       "${BASE}/"           200  "Commitments"
```

"Commitments" appears in the hero headline (`Commitments that execute themselves.`) and is unlikely to change. It is short enough to be reliable regardless of whitespace or encoding.

Also update the dashboard and pacts checks — they currently expect `404`, but `/dashboard` now redirects to `/sign-in` (302) for unauthenticated users. Update those:

```bash
check "dashboard_redirect"  "${BASE}/dashboard"   307
check "sign-in"             "${BASE}/sign-in"     200  "Pact"
```

The `307` is the Next.js redirect code from the middleware. `200` on `/sign-in` confirms our custom page renders. `"Pact"` appears in the sign-in page heading.

The full updated smoke test check section (replacing three lines):

```bash
check "home"                "${BASE}/"           200  "Commitments"
check "dashboard_redirect"  "${BASE}/dashboard"  307
check "sign-in"             "${BASE}/sign-in"    200  "Pact"
```

---

- [ ] **Step 22-2: Verify compilation**

```bash
cd /Users/olajideadeluwoye/Desktop/pact/pact && npx tsc --noEmit 2>&1
```

Expected: zero errors. (No TypeScript in smoke.sh, but run anyway to confirm nothing broke.)

---

- [ ] **Step 22-3: Commit**

```bash
git add .claude/skills/run-pact/smoke.sh && \
git commit -m "chore: Task 22 — update smoke test for real landing page content"
```

---

**⏸ CHECKPOINT 22 — Phase 4 complete.**

**Phase 4 gate — all must be true:**
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `http://localhost:3000` — real landing page, no boilerplate
- [ ] Fonts load correctly: DM Serif Display on headings, IBM Plex Sans on body
- [ ] `http://localhost:3000/sign-in` — dark sign-in card, magic link form
- [ ] `http://localhost:3000/verify` — "Check your email" page
- [ ] `http://localhost:3000/pacts/new` — 5-step form, all steps functional
- [ ] `http://localhost:3000/pacts/<EXECUTED_ID>/receipt` — loads without auth, shows hash
- [ ] Smoke test passes: `bash .claude/skills/run-pact/smoke.sh`

---

## Self-Review

| PRD/User Requirement | Task |
|---|---|
| Landing page: "Commitments that execute themselves." hero | 18 |
| Landing page: three-column How It Works | 18 |
| Landing page: three use case cards (Freelance, Vendor, Partnership) | 18 |
| Landing page: "Start for free" CTA → /sign-in | 18 |
| Landing page: minimal footer | 18 |
| Dark theme `#0C0C0E` background throughout | 18 |
| DM Serif Display headings, IBM Plex Sans body | 18 |
| Chartreuse `#D4FF4F` accent on CTAs only | 18 |
| No emoji in UI | 18 (verified: ✓ checkmarks use Unicode, not emoji) |
| Receipt page: public, no login required | 19 |
| Receipt page: parties — names only, no emails | 19 |
| Receipt page: conditions + fulfilment notes | 19 |
| Receipt page: execution hash (tamper-evident fingerprint) | 19 |
| Receipt page: "Built with Pact" link | 19 |
| Sign-in page: custom, no Auth.js default branding | 20 |
| Sign-in page: magic link form, dark theme | 20 |
| Verify page: "Check your email" | 20 |
| Create Pact: step indicator at top | 21 |
| Create Pact: Basics → Parties → Conditions → Review → Sent | 21 |
| Create Pact: invite links visible in Step 5 | 21 |
| Smoke test: updated for real content | 22 |
