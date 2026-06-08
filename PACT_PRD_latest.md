# Pact — Multi-Party Commitment Execution Platform
## Product Requirements Document v1.0
**Hackathon:** AWS × Vercel H0 Hackathon  
**Track:** Track 2 — Monetizable B2B App  
**Database:** Amazon Aurora DSQL  
**Frontend:** Next.js 14 deployed on Vercel  
**Status:** Pre-build — authoritative specification  
**Last updated:** June 2026

---

## Table of Contents

1. [Clarification: What Pact Is and Is Not](#1-clarification)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [User Personas](#4-user-personas)
5. [Core User Journey](#5-core-user-journey)
6. [Feature Specification](#6-feature-specification)
7. [Technical Architecture](#7-technical-architecture)
8. [Database Schema](#8-database-schema)
9. [API Routes](#9-api-routes)
10. [Page Inventory and UI Specification](#10-page-inventory)
11. [Design Direction](#11-design-direction)
12. [Real-time Architecture](#12-real-time-architecture)
13. [Aurora DSQL Justification](#13-aurora-dsql-justification)
14. [Demo Strategy](#14-demo-strategy)
15. [Architecture Diagram Specification](#15-architecture-diagram)
16. [Submission Checklist](#16-submission-checklist)
17. [Out of Scope](#17-out-of-scope)
18. [Build Order and Timeline](#18-build-order)

---

## 1. Clarification

### What Pact IS

Pact is a **multi-party commitment coordination platform**. It allows two or more parties to define a set of obligations, agree to them, fulfil them, and have a shared outcome trigger automatically the moment every condition is met.

Think of it as a **programmable handshake**. When Party A does their part AND Party B does their part, something happens automatically — both parties see it, no one has to chase anyone, and there is an immutable record of everything.

**Real-world scenarios Pact solves:**
- Freelancer submits final deliverable → Client reviews and accepts → Both parties mark complete → Project closes with full audit trail
- Vendor confirms shipment → Buyer confirms receipt → Invoice is auto-approved for payment
- Two business partners both commit to a joint campaign → Agreement activates, both notified simultaneously
- Event organiser opens registration → Minimum participant threshold reached → Event confirms and all registrants notified
- Agency reaches agreed milestone → Client signs off → Next retainer phase unlocks

### What Pact IS NOT

| Not This | Why It Is Out of Scope |
|---|---|
| Legal document management | We do not generate contracts or provide legal templates |
| E-signature platform | We use simple digital acknowledgement, not DocuSign-level legal signing |
| Payment processor | We record payment intent and trigger — we do not move money |
| Law firm tooling | No legal advice, no compliance workflows, no court documents |
| Contract lifecycle management | We do not store or manage legal agreements as documents |

**The mental model:** Pact is to business coordination what Stripe is to payments. Stripe does not tell you what to sell. Pact does not tell you what to agree on. Both give you the infrastructure to execute reliably.

---

## 2. Problem Statement

### The Reality of Cross-Party Business Commitments Today

Every B2B engagement that involves two or more parties fulfilling obligations to each other is currently managed through one of the following:

- **Email chains** — "Just confirming you received the files?" — no automation, no audit trail, no guaranteed state
- **Spreadsheets** — Manually tracked, not real-time, single point of failure
- **Project management tools** — Trello/Asana track internal tasks, not cross-organisational commitments
- **DocuSign** — Signs documents. Does not execute conditions. A PDF is not a workflow.
- **Verbal agreements** — One party remembers differently to the other. Always.

**The result:**
- Payments delayed because nobody confirmed receipt formally
- Projects stalled waiting for a sign-off nobody was prompted to give
- Disputes over whether a deliverable was "accepted" or just "seen"
- No auditable timeline when a breakdown occurs
- Chasing people over WhatsApp for confirmations that should be automatic

### The Scale of the Problem

- The global freelance market is worth $1.5T+ annually
- B2B service contracts represent tens of trillions in global commerce
- The average enterprise manages hundreds of vendor and partner commitments simultaneously
- 57% of B2B payment disputes originate in ambiguity about fulfilment, not bad faith

### The Gap

There is no lightweight, programmable layer that says: **"These two parties agreed to X and Y. When both are done, Z happens. Here is the proof."**

That is what Pact builds.

---

## 3. Solution Overview

### Core Concept

A **Pact** is a structured commitment between two or more named parties. Each Pact has:

- **Parties** — the named participants with defined roles
- **Conditions** — discrete obligations each party must fulfil
- **Trigger** — what happens when all conditions are met (currently: status flips to EXECUTED and all parties are notified)
- **Audit Trail** — every event, timestamped and immutable

When the last condition is fulfilled, Aurora DSQL executes a single ACID transaction that atomically:
1. Marks all conditions as complete
2. Marks the Pact as EXECUTED
3. Writes the execution event to the audit log
4. Broadcasts the state change to all connected parties via SSE

This cannot partially complete. Either the Pact executes fully or it does not execute at all. That guarantee is the product.

### The Three-Sentence Pitch

> Businesses lose time, money, and trust when multi-party commitments fall apart due to miscommunication, missed confirmations, and no audit trail. Pact gives any two or more parties a shared, real-time workspace to define obligations, fulfil them, and execute a joint outcome automatically the moment both sides are done. Unlike email or project tools, Pact's execution is atomic — backed by Aurora DSQL's distributed ACID guarantees across regions — meaning the moment of agreement is simultaneous and permanent, no matter where in the world each party is.

---

## 4. User Personas

### Persona 1 — Alex, the Independent Consultant (Primary)
- **Role:** Freelance UX designer, 8 years experience
- **Problem:** Clients accept work verbally but delay formal sign-off. Payments lag. Disputes arise about "did you actually approve this?"
- **Needs:** A way to make client acceptance of deliverables unambiguous, automatic, and timestamped
- **Tech comfort:** High. Uses Figma, Notion, Linear daily.
- **Expectation:** Simple to set up. Client should not need to be technical.

### Persona 2 — Priya, the Operations Manager at a Scale-up (Secondary)
- **Role:** Ops Manager, 60-person B2B software company
- **Problem:** Managing vendor deliverables and partner commitments across email is breaking as the company scales. No single source of truth.
- **Needs:** A lightweight coordination tool that is not as heavy as full contract management software. Needs to see status across multiple active Pacts.
- **Tech comfort:** Medium-high. Uses Salesforce, Asana, Slack.
- **Expectation:** Dashboard overview. Status at a glance. Team members can manage their own Pacts.

### Persona 3 — Marcus, the Agency Owner (Secondary)
- **Role:** Owner of a 12-person digital agency
- **Problem:** Project handoffs are messy. When a client "accepts" a phase but has not explicitly done so, the next invoice is contested.
- **Needs:** A documented, timestamped record of every client acceptance. Something professional-looking to send to clients.
- **Tech comfort:** Medium. Needs a clean experience he can hand to clients who are not technical at all.
- **Expectation:** Client-facing flow must be dead simple. One link, one action.

---

## 5. Core User Journey

### End-to-End Flow (Primary Path)

```
[Creator] Creates Pact
    ↓
Defines title, description, parties (by email), conditions, and outcome description
    ↓
[System] Sends invite to each party via email (Resend)
    ↓
[Each Party] Clicks link → lands on Pact page → reviews and ACCEPTS the Pact
    ↓
[System] When all parties accepted → Pact moves to ACTIVE
    ↓
[Each Party] Marks their assigned condition(s) as FULFILLED (optionally attaches note or file link)
    ↓
[System] Checks: are all required conditions fulfilled?
    ↓ YES
[Aurora DSQL] Executes single ACID transaction:
    - All conditions → FULFILLED
    - Pact status → EXECUTED
    - Execution event written to audit_log
    - Timestamp locked
    ↓
[System] SSE broadcasts EXECUTED event to all connected parties in real time
    ↓
[All Parties] See Pact flip to EXECUTED simultaneously, regardless of region
    ↓
[Any Party] Can view full immutable audit trail at any time
```

### State Machine

```
DRAFT ──────────────────────────────────────────────────────► VOID
  │                                                            ▲
  ▼                                                            │
PENDING_ACCEPTANCE ──────────────────────────────────────────►│
  │                                                            │
  ▼                                                            │
ACTIVE ──────────────────────────────────────────────────────►│
  │                                                            │
  ├── (all conditions fulfilled) ──────────────────► EXECUTED
  │
  └── (dispute raised) ──────────────────────────► IN_DISPUTE
                                                        │
                                                        ▼
                                                   RESOLVED ──► EXECUTED or VOID
```

**State Transition Rules:**
| From | To | Trigger | Who |
|---|---|---|---|
| DRAFT | PENDING_ACCEPTANCE | Creator submits Pact | Creator |
| PENDING_ACCEPTANCE | ACTIVE | All parties have accepted | System (automatic) |
| ACTIVE | EXECUTED | All conditions fulfilled | System (ACID transaction) |
| ACTIVE | IN_DISPUTE | Any party raises dispute | Any party |
| ACTIVE | VOID | All parties agree to cancel | All parties |
| IN_DISPUTE | RESOLVED | Creator or majority resolves | Creator |
| RESOLVED | EXECUTED | Creator confirms resolution | Creator |
| RESOLVED | VOID | Creator voids | Creator |

---

## 6. Feature Specification

### Priority Levels
- **P0** — Must ship. Hackathon fails without it.
- **P1** — Should ship. Significantly strengthens the demo.
- **P2** — Post-hackathon roadmap. Do not build during hackathon.

---

### P0 — Core Features (Non-Negotiable)

#### F-01: Authentication
- Email magic link auth via **Auth.js v5 (NextAuth)** with Resend as the email provider
- No passwords. Clean B2B onboarding.
- Sessions stored directly in Aurora DSQL via the Drizzle adapter — auth data lives in the same database as the rest of the application
- User profile: name, email, avatar (initials fallback)
- Session persistence via database-backed sessions (not JWT — database sessions allow instant revocation)
- Zero external auth service — no third-party SaaS dependency, no branding, no runtime dependency on an external platform

#### F-02: Create a Pact
- Title (required)
- Description / context (required, rich text via Tiptap — minimal config)
- Add parties by email (minimum 2 including creator, maximum 5)
- Define conditions: for each condition — title, description, assigned party (who must fulfil it)
- Outcome statement: what this Pact represents when executed (one sentence)
- Submit → generates invite emails to all parties

#### F-03: Accept a Pact (Party Onboarding Flow)
- Invite link in email → lands on `/pact/[id]/accept`
- Shows Pact summary: title, parties, their specific condition
- "Accept and participate" button
- If not logged in → prompted to create account or sign in with magic link first
- Acceptance recorded with timestamp in DSQL

#### F-04: Pact Detail View
- Pact title, description, status badge
- Parties list with acceptance status for each (accepted / pending)
- Conditions list with status for each (pending / fulfilled) and assigned party
- Audit timeline (right sidebar or bottom section) — every event in chronological order
- "Mark as Fulfilled" button on conditions assigned to the logged-in user

#### F-05: Condition Fulfilment
- Party clicks "Mark as Fulfilled" on their assigned condition
- Optional: add a fulfilment note (text, max 500 chars) or a URL (link to deliverable, document, etc.)
- Confirmation modal before committing
- On submit: write fulfilment record to DSQL → check if all conditions now fulfilled → if yes, fire execution transaction

#### F-06: Atomic Execution Transaction (The Technical Core)
- Single DSQL transaction:
  ```sql
  BEGIN;
    UPDATE pacts SET status = 'EXECUTED', executed_at = NOW() WHERE id = $pactId;
    INSERT INTO audit_log (pact_id, event_type, actor_id, payload, created_at)
      VALUES ($pactId, 'PACT_EXECUTED', 'system', $payload, NOW());
  COMMIT;
  ```
- This transaction only runs when ALL conditions are FULFILLED
- Idempotency check: if already EXECUTED, do nothing
- On commit: broadcast execution event via SSE to all connected clients

#### F-07: Real-time Status Updates (SSE)
- `/api/pacts/[id]/stream` — Server-Sent Events endpoint
- Pact detail page subscribes on mount
- Events pushed: `condition_fulfilled`, `party_accepted`, `pact_executed`, `pact_voided`
- Client receives event → React state updates without page refresh
- The EXECUTED event visually flips the status badge in real time — this is the demo moment

#### F-08: Audit Trail
- Immutable log of every event on a Pact
- Events: CREATED, PARTY_INVITED, PARTY_ACCEPTED, CONDITION_FULFILLED, PACT_EXECUTED, PACT_VOIDED, DISPUTE_RAISED
- Each event: timestamp, actor, event type, optional payload (note, URL, etc.)
- Displayed chronologically in the Pact detail view
- Hash chain on audit entries (each entry hashes its content + previous entry's hash) — tamper-evident

#### F-09: Dashboard
- List of all Pacts the logged-in user is involved in
- Status filter: All / Active / Pending / Executed / Void
- Each Pact card: title, parties (avatars), status badge, condition completion count (e.g. "2/3 conditions met"), last activity timestamp
- "New Pact" CTA prominent

#### F-10: Email Notifications via Resend
- Party invite email: clean, branded, explains the Pact and their condition, CTA link
- Condition fulfilled notification: tells other parties that progress was made
- Execution notification: all parties receive "Pact executed" confirmation email
- Vercel + Resend integration (native, easy to configure)

---

### P1 — Should Ship (Strengthens Demo Significantly)

#### F-11: Void / Cancel a Pact
- Any party can propose voiding
- All parties must agree (each clicks "Agree to void")
- When all agree → atomic DSQL transaction sets status to VOID
- Adds nuance to the state machine demo

#### F-12: Dispute Flag
- Any party can raise a dispute with a written reason
- Pact moves to IN_DISPUTE
- Creator can resolve: mark as resolved + outcome note
- Then creator decides: execute or void
- Demonstrates the full state machine in the demo

#### F-13: Pact Template (Preset Structures)
- 3 preset templates creators can start from:
  - Freelance Project Handoff
  - Vendor Delivery Confirmation
  - Partnership Commitment
- Templates pre-populate condition structures
- Purely UX sugar — same data model underneath
- Makes the demo faster (less typing live)

#### F-14: Shareable Pact Link
- Public read-only view of an EXECUTED Pact
- Shows parties, conditions, execution timestamp, audit trail
- No login required to view
- Use case: "Here is the proof we both agreed and both fulfilled our obligations"
- URL: `/pact/[id]/receipt` — branded as "Execution Receipt"

---

### P2 — Post-Hackathon Roadmap (Do Not Build)

- Webhook integration (POST to external URL on execution)
- Stripe payment trigger on execution
- API access for programmatic Pact creation
- Team workspaces and role management
- Recurring Pacts (repeat every month)
- PDF export of Pact and audit trail
- Slack / Microsoft Teams notifications
- Mobile app

---

## 7. Technical Architecture

### Stack Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VERCEL PLATFORM                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   Next.js 14 (App Router)                    │  │
│  │                                                              │  │
│  │   /app                                                       │  │
│  │   ├── (auth)/          → Custom sign-in page (Auth.js magic link) │  │
│  │   ├── dashboard/       → User dashboard                     │  │
│  │   ├── pacts/           → Pact CRUD and detail views         │  │
│  │   │   ├── new/         → Create Pact flow                   │  │
│  │   │   └── [id]/        → Pact detail, accept, receipt       │  │
│  │   └── api/             → API Route Handlers                 │  │
│  │       ├── pacts/       → CRUD operations                    │  │
│  │       ├── conditions/  → Fulfilment operations              │  │
│  │       └── stream/      → SSE endpoints                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐    │
│  │  Vercel Edge │  │  Vercel Cron  │  │    Vercel Blob       │    │
│  │  Functions   │  │  (future use) │  │  (future file attach) │    │
│  └──────────────┘  └───────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │    AURORA DSQL      │
                   │  (Multi-Region)     │
                   │                    │
                   │  us-east-1 ◄──►   │
                   │  eu-west-1         │
                   │  (active-active)   │
                   └────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
           Resend         (future)         (future)
    (Magic link + emails)  (Payments)    (Webhooks)
```

### Technology Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 App Router | Vercel-native, RSC for fast initial loads, API routes collocated |
| Language | TypeScript (strict mode) | Type safety on financial/state data is non-negotiable |
| Database | Aurora DSQL | Distributed ACID multi-region writes — see Section 13 |
| ORM | Drizzle ORM | TypeScript-first, Aurora DSQL / PostgreSQL compatible, lightweight |
| Auth | Auth.js v5 (NextAuth) | Open-source, self-hosted, no external service, no branding, sessions stored in Aurora DSQL via Drizzle adapter — keeps the entire auth layer inside our own infrastructure |
| UI Components | shadcn/ui (customised) | Accessible, unstyled base — we apply our own design system over it |
| Email | Resend | Vercel-native partner, React Email templates, magic link delivery for Auth.js |
| Real-time | Vercel KV (Redis) pub/sub + SSE | Serverless-safe real-time events — in-memory Map breaks across Vercel function instances; KV pub/sub works across all instances |
| Styling | Tailwind CSS + CSS variables | Utility-first, easy theming, Vercel-optimal |
| State Management | Zustand | Lightweight, server-state with React Query for server sync |
| Server State | TanStack Query (React Query) | Caching, optimistic updates, background refetch |
| Deployment | Vercel (automatic on push) | Required by hackathon, first-class Next.js support |

### Auth.js Configuration Reference

```typescript
// auth.ts — lives at project root
import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),          // sessions stored in Aurora DSQL
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: 'noreply@usepact.app',
    }),
  ],
  pages: {
    signIn: '/sign-in',                 // our custom page — full design control
    verifyRequest: '/verify',           // "check your email" page
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id         // expose DB user ID on the session object
      return session
    },
  },
})

// middleware.ts — lives at project root
import { auth } from './auth'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/sign-in', '/verify', '/pacts/*/accept', '/pacts/*/receipt']

export default auth((req) => {
  const isPublic = PUBLIC_PATHS.some(pattern =>
    new RegExp(`^${pattern.replace('*', '[^/]+')}$`).test(req.nextUrl.pathname)
  )
  if (!isPublic && !req.auth) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }
})

export const config = { matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'] }
```

**Why this approach is clean for judges:**
- `auth.ts` is the single source of truth for all authentication configuration
- Sessions are in Aurora DSQL — the auth layer and the application layer share one database
- No external service involved at runtime — if Resend is down, existing sessions still work
- The custom sign-in page is 100% your design — no third-party UI rendered anywhere



```
pact/
├── middleware.ts                    ← Auth.js route protection (protects all routes except public ones)
├── auth.ts                         ← Auth.js config: NextAuth + Resend provider + Drizzle adapter
├── app/
│   ├── (auth)/
│   │   ├── sign-in/page.tsx        ← Custom sign-in page (your design, Auth.js logic)
│   │   └── verify/page.tsx         ← "Check your email" confirmation page
│   ├── dashboard/
│   │   └── page.tsx
│   ├── pacts/
│   │   ├── new/
│   │   │   └── page.tsx            ← Create Pact multi-step form
│   │   └── [id]/
│   │       ├── page.tsx            ← Pact detail view
│   │       ├── accept/page.tsx     ← Party acceptance flow
│   │       └── receipt/page.tsx    ← Public execution receipt
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts        ← Auth.js handler (GET + POST)
│   │   ├── pacts/
│   │   │   ├── route.ts            ← GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts        ← GET detail, PATCH update
│   │   │       ├── accept/route.ts ← POST party acceptance
│   │   │       ├── void/route.ts   ← POST void proposal
│   │   │       └── stream/route.ts ← GET SSE stream
│   │   └── conditions/
│   │       └── [id]/
│   │           └── fulfil/route.ts ← POST condition fulfilment
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── pact/
│   │   ├── PactCard.tsx
│   │   ├── PactStatusBadge.tsx
│   │   ├── ConditionItem.tsx
│   │   ├── AuditTimeline.tsx
│   │   ├── PartyAvatar.tsx
│   │   └── ExecutionBanner.tsx     ← The animated moment of execution
│   ├── forms/
│   │   ├── CreatePactForm.tsx
│   │   └── FulfilConditionModal.tsx
│   └── ui/                         ← shadcn/ui customised components
├── lib/
│   ├── db/
│   │   ├── index.ts                ← Drizzle client + Aurora DSQL connection
│   │   ├── schema.ts               ← Full schema definition (includes Auth.js tables)
│   │   └── queries/
│   │       ├── pacts.ts
│   │       ├── conditions.ts
│   │       └── audit.ts
│   ├── email/
│   │   ├── index.ts                ← Resend client
│   │   └── templates/
│   │       ├── InviteEmail.tsx
│   │       ├── FulfilledEmail.tsx
│   │       └── ExecutedEmail.tsx
│   ├── execution.ts                ← The atomic execution transaction logic
│   ├── audit.ts                    ← Audit log writer + hash chain
│   └── sse.ts                      ← SSE event broadcaster
├── drizzle/
│   ├── migrations/
│   └── drizzle.config.ts
├── .env.local.example
├── .env.local                      ← NEVER commit
└── package.json
```

---

## 8. Database Schema

### Design Principles

- All primary keys are UUIDs (`gen_random_uuid()`)
- All timestamps use `TIMESTAMPTZ` (timezone-aware)
- Append-only audit log — no deletes, no updates
- `idempotency_key` on critical mutation tables (prevents duplicate writes)
- Status as `VARCHAR` with check constraints (not enums — DSQL compatibility)
- Soft deletes not used — explicit void status instead

### Full Schema

```sql
-- ============================================================
-- USERS
-- Our own user record — populated from Auth.js on first sign-in
-- via the Drizzle adapter's createUser callback
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  display_name  VARCHAR(100),
  avatar_url    TEXT,
  email_verified TIMESTAMPTZ,          -- set by Auth.js when magic link is clicked
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);


-- ============================================================
-- AUTH.JS REQUIRED TABLES (Drizzle Adapter)
-- These are required by Auth.js for database sessions.
-- Do not modify their structure — Auth.js owns these.
-- ============================================================
CREATE TABLE accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                VARCHAR(255) NOT NULL,
  provider            VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          INTEGER,
  token_type          VARCHAR(255),
  scope               VARCHAR(255),
  id_token            TEXT,
  session_state       VARCHAR(255),
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);

CREATE TABLE verification_tokens (
  identifier VARCHAR(255) NOT NULL,    -- the user's email
  token      VARCHAR(255) UNIQUE NOT NULL,
  expires    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);
-- Note: Auth.js deletes verification tokens after use automatically


-- ============================================================
-- PACTS
-- The core agreement record
-- ============================================================
CREATE TABLE pacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        UUID NOT NULL REFERENCES users(id),
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  outcome_statement TEXT NOT NULL,      -- "What happens when this Pact executes"
  status            VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN (
                      'DRAFT', 'PENDING_ACCEPTANCE', 'ACTIVE',
                      'EXECUTED', 'IN_DISPUTE', 'RESOLVED', 'VOID'
                    )),
  executed_at       TIMESTAMPTZ,        -- set in the atomic execution transaction
  voided_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pacts_creator_id ON pacts(creator_id);
CREATE INDEX idx_pacts_status     ON pacts(status);


-- ============================================================
-- PARTIES
-- Participants in a Pact
-- ============================================================
CREATE TABLE parties (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pact_id        UUID NOT NULL REFERENCES pacts(id),
  user_id        UUID REFERENCES users(id),           -- NULL until they register/join
  email          VARCHAR(255) NOT NULL,
  display_name   VARCHAR(100),
  role           VARCHAR(30) NOT NULL DEFAULT 'PARTICIPANT'
                 CHECK (role IN ('CREATOR', 'PARTICIPANT', 'ARBITRATOR')),
  accepted       BOOLEAN DEFAULT FALSE,
  accepted_at    TIMESTAMPTZ,
  invite_token   VARCHAR(128) UNIQUE NOT NULL,        -- token in invite link
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parties_pact_id      ON parties(pact_id);
CREATE INDEX idx_parties_user_id      ON parties(user_id);
CREATE INDEX idx_parties_email        ON parties(email);
CREATE INDEX idx_parties_invite_token ON parties(invite_token);
-- One user per pact
CREATE UNIQUE INDEX idx_parties_pact_user ON parties(pact_id, user_id) 
  WHERE user_id IS NOT NULL;


-- ============================================================
-- CONDITIONS
-- Discrete obligations within a Pact
-- ============================================================
CREATE TABLE conditions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pact_id         UUID NOT NULL REFERENCES pacts(id),
  assigned_party_id UUID NOT NULL REFERENCES parties(id),
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING', 'FULFILLED')),
  fulfilled_at    TIMESTAMPTZ,
  idempotency_key VARCHAR(128) UNIQUE,   -- prevents double-fulfilment on retry
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conditions_pact_id          ON conditions(pact_id);
CREATE INDEX idx_conditions_assigned_party_id ON conditions(assigned_party_id);
CREATE INDEX idx_conditions_status            ON conditions(status);


-- ============================================================
-- CONDITION FULFILMENTS
-- Evidence record when a party marks a condition done
-- ============================================================
CREATE TABLE condition_fulfilments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id  UUID NOT NULL REFERENCES conditions(id),
  party_id      UUID NOT NULL REFERENCES parties(id),
  note          TEXT,
  reference_url TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_fulfilments_condition_id ON condition_fulfilments(condition_id);


-- ============================================================
-- AUDIT LOG
-- Immutable append-only event log
-- Hash chain for tamper-evidence
-- ============================================================
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pact_id       UUID NOT NULL REFERENCES pacts(id),
  event_type    VARCHAR(50) NOT NULL
                CHECK (event_type IN (
                  'PACT_CREATED', 'PACT_SUBMITTED', 'PARTY_INVITED',
                  'PARTY_ACCEPTED', 'PACT_ACTIVATED',
                  'CONDITION_FULFILLED', 'PACT_EXECUTED',
                  'DISPUTE_RAISED', 'DISPUTE_RESOLVED',
                  'VOID_PROPOSED', 'VOID_AGREED', 'PACT_VOIDED'
                )),
  actor_id      UUID REFERENCES users(id),  -- NULL for system events
  actor_label   VARCHAR(100),               -- display name at time of event
  payload       JSONB,                      -- event-specific data
  previous_hash VARCHAR(64),               -- SHA-256 of previous entry
  entry_hash    VARCHAR(64) NOT NULL,       -- SHA-256 of this entry + previous_hash
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_pact_id    ON audit_log(pact_id);
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(pact_id, created_at);
-- No UPDATE or DELETE should ever be run against this table


-- ============================================================
-- EXECUTIONS
-- Dedicated execution record — one row per Pact, ever.
-- UNIQUE(pact_id) is a database-level guarantee that a Pact
-- can execute exactly once, regardless of application code.
-- This is stronger than checking pacts.status in application
-- logic before running the transaction.
-- ============================================================
CREATE TABLE executions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pact_id           UUID NOT NULL REFERENCES pacts(id),
  executed_by       UUID REFERENCES users(id),   -- last party to fulfil (triggering party)
  execution_hash    VARCHAR(64) NOT NULL,         -- SHA-256 of execution payload — queryable proof
  execution_payload JSONB,                        -- snapshot: all parties, all conditions, timestamps
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pact_id)                                 -- database enforces: one execution per Pact, forever
);

CREATE INDEX idx_executions_pact_id ON executions(pact_id);


-- ============================================================
-- VOID PROPOSALS (P1)
-- Tracks per-party agreement to void a Pact
-- ============================================================
CREATE TABLE void_proposals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pact_id    UUID NOT NULL REFERENCES pacts(id),
  party_id   UUID NOT NULL REFERENCES parties(id),
  agreed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pact_id, party_id)
);
```

### Key Query Patterns

#### DSQL Retry Wrapper
Aurora DSQL uses OCC and defers all conflict detection to commit time. Any write transaction can receive a serialization failure. This is not an edge case — it is normal operation. All write transactions must be wrapped in this retry helper.

Three error codes to handle:
- `40001` — PostgreSQL serialization failure (row-level OCC conflict)
- `OC000` — DSQL-specific OCC conflict on same row
- `OC001` — DSQL-specific conflict on schema version (cached catalog mismatch)

```typescript
// lib/dsql-retry.ts
const isDsqlConflict = (error: any): boolean =>
  error?.code === '40001' ||  // PostgreSQL serialization failure
  error?.code === 'OC000'  ||  // DSQL OCC row conflict
  error?.code === 'OC001'      // DSQL schema version conflict

export async function withDsqlRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      if (isDsqlConflict(error) && attempt < maxAttempts - 1) {
        // Exponential backoff: 0ms, 50ms, 100ms
        await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)))
        continue
      }
      throw error
    }
  }
  throw new Error('DSQL transaction failed after max retries')
}
```

#### Execution Transaction (The Technical Core)
The transaction sequence, in exact order:

1. Check Pact is `ACTIVE`
2. Check no required condition is still `PENDING`
3. Update Pact to `EXECUTED`
4. Insert into `executions` (database-level idempotency via `UNIQUE(pact_id)`)
5. Insert into `audit_log`
6. Commit
7. Broadcast SSE event and send emails **after** commit

```typescript
// lib/execution.ts
import { withDsqlRetry } from './dsql-retry'

export async function attemptPactExecution(
  pactId: string,
  triggeringUserId: string
): Promise<{ executed: boolean }> {

  // Step 1 & 2: pre-flight checks (read-only, no transaction needed)
  const pendingConditions = await db
    .select({ count: sql<number>`count(*)` })
    .from(conditions)
    .where(and(
      eq(conditions.pactId, pactId),
      eq(conditions.status, 'PENDING')
    ))

  if (Number(pendingConditions[0].count) > 0) {
    return { executed: false }   // not all conditions fulfilled yet
  }

  // Steps 3–5: atomic transaction with OCC retry
  const result = await withDsqlRetry(async () => {
    return await db.transaction(async (tx) => {

      // Step 3: Update Pact status — also guards against race conditions
      // If two parties fulfil their conditions simultaneously and both
      // pass the pre-flight check above, only one will win here
      const updated = await tx
        .update(pacts)
        .set({ status: 'EXECUTED', executedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(pacts.id, pactId),
          eq(pacts.status, 'ACTIVE')   // guard: only transitions from ACTIVE
        ))
        .returning({ id: pacts.id })

      if (updated.length === 0) {
        return { executed: false }     // another transaction won the race
      }

      // Step 4: Insert execution record
      // UNIQUE(pact_id) is the database-level guarantee —
      // if a duplicate somehow reaches here, the constraint
      // throws rather than creating a second execution record
      const executionPayload = await buildExecutionPayload(tx, pactId)
      const executionHash = computeHash(executionPayload)

      await tx.insert(executions).values({
        pactId,
        executedBy:       triggeringUserId,
        executionHash,
        executionPayload,
      })

      // Step 5: Append to audit log
      const previousEntry = await tx
        .select()
        .from(auditLog)
        .where(eq(auditLog.pactId, pactId))
        .orderBy(desc(auditLog.createdAt))
        .limit(1)

      const entryHash = computeHash({
        pactId,
        eventType:    'PACT_EXECUTED',
        actorId:      null,
        actorLabel:   'system',
        payload:      { executedAt: new Date().toISOString(), executionHash },
        previousHash: previousEntry[0]?.entryHash ?? 'GENESIS',
      })

      await tx.insert(auditLog).values({
        pactId,
        eventType:    'PACT_EXECUTED',
        actorId:      null,
        actorLabel:   'system',
        payload:      { executedAt: new Date().toISOString(), executionHash },
        previousHash: previousEntry[0]?.entryHash ?? 'GENESIS',
        entryHash,
      })

      return { executed: true }
    })
  })

  // Steps 6–7: post-commit side effects (outside transaction, non-blocking)
  if (result.executed) {
    await broadcastPactEvent(pactId, {
      type:          'PACT_EXECUTED',
      executedAt:    new Date().toISOString(),
      executionHash: await getExecutionHash(pactId),
    })
    await sendExecutionEmails(pactId)
  }

  return result
}
```

---

## 9. API Routes

### Authentication
All routes call `auth()` from Auth.js to retrieve the current session. Returns `null` if unauthenticated — routes return `401` in that case. The `/api/pacts/[id]/accept` route accepts an invite token (no session required — this is the entry point for new users). Public receipt pages require no auth.

```typescript
// Pattern used in every protected API route
import { auth } from '@/auth'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }
  // session.user.id is the users.id from Aurora DSQL
  const userId = session.user.id
  // ...
}
```

### Route Specification

```
POST   /api/pacts
       Body: { title, description, outcomeStatement, parties: [{email, name, conditions: [{title, description}]}] }
       Response: { pact: Pact, parties: Party[], conditions: Condition[] }
       Side effects: Creates pact in DRAFT, sends invite emails, writes PACT_CREATED to audit log

GET    /api/pacts
       Query: ?status=ACTIVE&page=1&limit=20
       Response: { pacts: PactWithSummary[], total: number }
       Note: Returns only pacts the authenticated user is a party to

GET    /api/pacts/[id]
       Response: { pact, parties, conditions, auditLog, currentParty }
       Note: currentParty is the calling user's party record — drives UI permissions

POST   /api/pacts/[id]/accept
       Body: { inviteToken: string }    ← from invite link
       Response: { party: Party, pact: PactSummary }
       Side effects: Sets party.accepted = true, checks if all accepted → activates pact

POST   /api/pacts/[id]/submit
       Auth: Creator only
       Body: {}
       Response: { pact: Pact }
       Side effects: DRAFT → PENDING_ACCEPTANCE, sends invite emails

POST   /api/conditions/[id]/fulfil
       Body: { note?: string, referenceUrl?: string, idempotencyKey: string }
       Response: { condition: Condition, pactExecuted: boolean }
       Side effects: Marks condition FULFILLED, checks execution readiness, fires atomic tx if ready

POST   /api/pacts/[id]/dispute
       Body: { reason: string }
       Auth: Any party
       Response: { pact: Pact }
       Side effects: ACTIVE → IN_DISPUTE, notifies all parties

POST   /api/pacts/[id]/resolve
       Body: { resolution: string, outcome: 'EXECUTE' | 'VOID' }
       Auth: Creator only
       Response: { pact: Pact }

POST   /api/pacts/[id]/void
       Body: {}
       Auth: Any party
       Response: { voidProposal: VoidProposal, allAgreed: boolean }
       Side effects: Records agreement to void, checks if all agreed

GET    /api/pacts/[id]/stream
       Response: text/event-stream (SSE)
       Events: condition_fulfilled | party_accepted | pact_executed | pact_voided | dispute_raised
```

---

## 10. Page Inventory

### Page 1: Landing Page (`/`)
**Purpose:** Marketing / entry point. Must look like a real product.
**Sections:**
- Hero: "Commitments that execute themselves." — value prop in one line
- Three-column "How it works": Create → Commit → Execute
- Three use case cards: Freelance, Vendor, Partnership
- CTA: "Start for free" → `/sign-up`
- Footer: minimal

**Note:** This page must exist and look polished. Judges will see it first.

---

### Page 2: Dashboard (`/dashboard`)
**Purpose:** Overview of all user's Pacts
**Components:**
- Header with user avatar and "New Pact" button
- Status filter tabs: All | Active | Pending | Executed | Voided
- Pact cards grid:
  - Title
  - Party avatars (stacked, max 4 shown)
  - Status badge (colour-coded)
  - Condition progress: "2 of 3 conditions met" with mini progress bar
  - Last activity timestamp
  - Click → Pact detail
- Empty state: clear illustration and CTA to create first Pact

---

### Page 3: Create Pact (`/pacts/new`)
**Purpose:** Multi-step form to create a new Pact
**Steps:**
1. **Basics** — Title, description, outcome statement
2. **Parties** — Add party emails and names (add up to 4 counterparties)
3. **Conditions** — For each party (including creator), define their condition(s)
4. **Review** — Summary of everything before submission
5. **Sent** — Confirmation with copy-able invite link and status

**UX Notes:**
- Step indicator at top showing progress
- Each step validates before advancing
- Step 3 shows a visual "assignment" — drag/drop or dropdown to assign condition to party
- Review screen shows exactly what each party will see
- No back navigation to step 1 after submission

---

### Page 4: Pact Detail (`/pacts/[id]`)
**Purpose:** The main working view — where all the action happens
**Layout:** Two-column on desktop, single column on mobile

**Left column (main):**
- Pact title + status badge
- Outcome statement (callout box)
- Parties section:
  - Each party: avatar, name, email, accepted badge or "awaiting acceptance"
- Conditions section:
  - Each condition as a card:
    - Title + description
    - Assigned party avatar + name
    - Status: PENDING (grey) or FULFILLED (green checkmark)
    - If FULFILLED: note and reference URL if provided
    - If assigned to current user and PENDING: "Mark as Fulfilled" button
- If EXECUTED: Full-width "EXECUTED" banner (animated on first appearance)

**Right column (sidebar):**
- Audit Timeline: chronological list of all events
  - Event icon, event description, actor name, relative timestamp
  - Auto-scrolls to bottom on new event (SSE driven)
- Actions panel (if applicable):
  - Raise dispute
  - Propose void

**Real-time behaviour:**
- SSE connection open on page load
- Incoming events update state without page refresh
- "Party accepted" → their status updates live
- "Condition fulfilled" → condition card animates to FULFILLED
- "Pact executed" → full-page execution animation fires

---

### Page 5: Accept Pact (`/pacts/[id]/accept`)
**Purpose:** Landing page for invited parties
**UX:**
- Works without being logged in initially (shows Pact summary)
- Displays: Pact title, who created it, what the party's condition is
- If not logged in: "Sign in to accept" → magic link flow → redirects back here
- If logged in: "Accept and join this Pact" button
- Clean, reassuring design — this is a cold-entry page, must build trust instantly
- After acceptance: redirect to Pact detail page

---

### Page 6: Execution Receipt (`/pacts/[id]/receipt`)
**Purpose:** Public read-only "proof" page after execution
**Access:** No login required
**Content:**
- "Pact Executed" header with execution timestamp
- Parties (names only — no emails on public page)
- Conditions and their fulfilment notes
- Abridged audit trail: created → activated → executed
- Execution hash (last audit entry hash) — visual proof of integrity
- Branded Pact watermark
- "Built with Pact" link

---

## 11. Design Direction

### Visual Identity

**Concept:** "Trustworthy infrastructure." Think Stripe meets Linear. Dark, precise, minimal noise. Every element earns its place.

**Do NOT use:**
- Purple-gradient-on-white (the generic AI aesthetic)
- Generic card shadows everywhere
- Emoji in the UI
- Comic or rounded fonts that suggest playfulness
- Light blue "SaaS blue" as the primary colour

**Aesthetic Direction:**
- Dark mode default (`#0C0C0E` background)
- Off-white primary text (`#F0EFE8`)
- Surface cards: `#141416`
- Border: `#242428`
- Primary accent: `#D4FF4F` (electric chartreuse — memorable, professional when used sparingly)
  - Use ONLY for CTAs, active states, and the execution moment
- Status colours: `#22C55E` (fulfilled/executed), `#F59E0B` (pending/in-dispute), `#6B7280` (void)
- Error: `#EF4444`

**Typography:**
- Headings: `DM Serif Display` — authoritative, professional, slightly editorial
- Body: `IBM Plex Sans` — clean, technical, credible
- Monospace (hashes, tokens): `JetBrains Mono` — clearly technical where needed

**Motion:**
- Single moment of animation: the execution event
- When `PACT_EXECUTED` SSE event arrives → status badge scales up, colour fills, brief haptic-like pulse
- All other transitions: 150ms ease-out only
- No decorative animation elsewhere — restraint signals professionalism

**Component Design:**
- Status badges: pill with icon + label (colour drives meaning, icon reinforces)
- Condition cards: left border colour strip indicating status
- Audit timeline: vertical line with event dots (not a table)
- Party avatars: coloured initials circle, colour is deterministic from name hash

---

## 12. Real-time Architecture

### SSE Architecture — Why In-memory Does Not Work on Vercel

Vercel serverless functions are stateless. Each HTTP request can land on a different function instance. An in-memory `Map` of SSE listeners only exists within one instance — if Party A connects to instance X and Party B's fulfilment event is processed by instance Y, Party A never receives the event. This is not an edge case. On Vercel it happens routinely.

**Solution: Vercel KV (Redis) as the pub/sub layer.**

Vercel KV is a first-class Vercel product (Redis under the hood). Every function instance subscribes to and publishes on the same Redis channel. All SSE clients receive all events regardless of which instance handles their connection.

```
Party B fulfils condition
    ↓
API Route (any Vercel instance)
    ↓ writes to Aurora DSQL
    ↓ publishes to Vercel KV channel: "pact:{id}"
    ↓
Vercel KV (Redis)
    ↓ broadcasts to all subscribers
    ↓
SSE Route instances (one per connected browser tab)
    ↓ streams event to browser
    ↓
Party A's browser receives PACT_EXECUTED in real time
```

### SSE Implementation

```typescript
// app/api/pacts/[id]/stream/route.ts
import { NextRequest }  from 'next/server'
import { auth }         from '@/auth'
import { kv }           from '@vercel/kv'

export const runtime = 'nodejs'    // KV subscribe requires Node.js runtime

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorised', { status: 401 })

  const party = await verifyPartyMembership(params.id, session.user.id)
  if (!party) return new Response('Forbidden', { status: 403 })

  const channel = `pact:${params.id}`
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Confirm connection
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`
      ))

      // Subscribe to Vercel KV channel
      // kv.subscribe keeps the connection open and calls the callback on each message
      await kv.subscribe(channel, (message: string) => {
        controller.enqueue(encoder.encode(`data: ${message}\n\n`))
      })
    },
    cancel() {
      kv.unsubscribe(channel)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}


// lib/sse.ts — broadcast helper called after every DB write
import { kv } from '@vercel/kv'

export async function broadcastPactEvent(
  pactId: string,
  event: PactSSEEvent
): Promise<void> {
  await kv.publish(`pact:${pactId}`, JSON.stringify(event))
}
```

**Why this is better than polling fallback:**
The database is still the source of truth. If an SSE connection drops, the client reconnects and the browser re-fetches current Pact state. But under normal conditions every connected party receives the execution event in real time — that visual moment is the demo. Polling every 2 seconds would make the execution look laggy. Vercel KV makes it instant and correct.

**What to add to environment variables:**
```
KV_URL         (from Vercel KV dashboard — auto-populated when you connect KV to project)
KV_REST_API_URL
KV_REST_API_TOKEN
```
Vercel KV auto-injects these when you connect a KV store to your project via the Vercel dashboard. No manual setup beyond clicking "Connect."

### Client-Side SSE Hook

```typescript
// hooks/usePactStream.ts
export function usePactStream(pactId: string, onEvent: (event: PactSSEEvent) => void) {
  useEffect(() => {
    const eventSource = new EventSource(`/api/pacts/${pactId}/stream`);

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as PactSSEEvent;
        if (event.type !== 'CONNECTED') {
          onEvent(event);
        }
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      // Reconnect automatically after 3 seconds
      eventSource.close();
      setTimeout(() => eventSource.dispatchEvent(new Event('open')), 3000);
    };

    return () => eventSource.close();
  }, [pactId]);
}
```

### SSE Event Types

```typescript
type PactSSEEvent =
  | { type: 'CONNECTED' }
  | { type: 'PARTY_ACCEPTED'; partyId: string; partyName: string; timestamp: string }
  | { type: 'PACT_ACTIVATED'; timestamp: string }
  | { type: 'CONDITION_FULFILLED'; conditionId: string; conditionTitle: string; partyName: string; note?: string; timestamp: string }
  | { type: 'PACT_EXECUTED'; executedAt: string; executionHash: string }
  | { type: 'PACT_VOIDED'; timestamp: string }
  | { type: 'DISPUTE_RAISED'; raisedBy: string; reason: string; timestamp: string };
```

---

## 13. Aurora DSQL Justification

This section is critical. Judges will probe this. Have answers ready in the demo.

### Why Aurora DSQL — Not Aurora PostgreSQL, Not DynamoDB

**The core scenario that demands DSQL:**

A Pact between a consultant in Lagos, a client in New York, and a reviewer in Berlin. All three are simultaneously active on the Pact detail page. Within seconds of each other:
- The consultant clicks "Mark condition as fulfilled" (write to `conditions` table in `eu-west-1`)
- The client clicks "Mark condition as fulfilled" (write to `conditions` table in `us-east-1`)
- The system must check: are ALL conditions now fulfilled?
- If yes: execute an ACID transaction that atomically marks the Pact EXECUTED

**Why Aurora PostgreSQL fails here:**
- Has a single primary writer region
- The Berlin write goes to `eu-west-1` primary → replicates to `us-east-1` secondary
- Write latency from New York to Berlin primary is 80-120ms
- More importantly: during the execution check, you may read the `eu-west-1` primary and not yet see the `us-east-1` secondary write
- You cannot guarantee the "all conditions fulfilled" check is globally consistent at the moment of execution
- Under load, this produces ghost executions or missed executions

**Why DynamoDB is the wrong choice for Pact — the accurate argument:**

DynamoDB is an exceptional database. Do not dismiss it. As of June 2025, DynamoDB Global Tables supports Multi-Region Strong Consistency (MRSC) with zero RPO, which is genuinely impressive. A judge who works on DynamoDB will know this. Do not claim DynamoDB cannot do multi-region consistency — that argument is now out of date and will damage your credibility on everything else.

The correct argument is about **data model fit**, not consistency:

> "DynamoDB is excellent for key-value and access-pattern-first workloads at extreme scale. Pact's domain is fundamentally relational: pacts reference parties, parties reference conditions, conditions reference fulfilments, fulfilments feed an audit log with hash chains, and executions record the immutable outcome. Aurora DSQL lets us express and enforce that relational structure natively in SQL — with foreign keys, check constraints, and multi-table ACID transactions — without any application-level denormalisation or workarounds. For a domain where the data relationships are the product, SQL is simply the right tool. DynamoDB would require us to abandon referential integrity and redesign every access pattern around partition keys, which adds complexity with no benefit for this use case."

This argument is accurate, cannot be countered by a DynamoDB expert, and demonstrates you understand both databases properly — which itself scores points on Technical Implementation.

**Why Aurora DSQL is the only correct choice:**
- Active-active multi-region writes: Lagos, New York, Berlin all write to their nearest region with full write availability
- All writes are globally consistent under ACID guarantees: the "are all conditions fulfilled?" check sees a globally consistent view
- Optimistic concurrency control: if two concurrent writes conflict, DSQL's OCC resolves it cleanly — no deadlocks
- The execution transaction is a single ACID transaction: either the Pact is EXECUTED atomically everywhere, or it is not. There is no "EXECUTED in us-east-1 but still ACTIVE in eu-west-1"

**The one-line answer for judges:**
> "The moment of execution must be simultaneous and permanent for all parties regardless of where they are. Aurora DSQL is the only AWS database that guarantees this with SQL and ACID semantics."

---

## 14. Demo Strategy

### The 3-Minute Demo Script

**Act 1: The Problem (0:00 — 0:25)**

Open on a mock email chain. Subject line: "RE: RE: RE: Have you confirmed receipt yet?" Four replies deep. No resolution.

Voiceover: "This is how most B2B commitments end up. Somewhere in an email chain. No automation. No proof. No accountability."

Cut to Pact landing page. Clean, dark, professional.

"Pact gives any two parties a programmable handshake. When both sides have done their part, it executes. Automatically. Permanently."

---

**Act 2: Create a Pact (0:25 — 1:10)**

Screen: logged in as "Alex Chen" (creator)

1. Click "New Pact"
2. Type: Title: "Website Redesign — Final Delivery"
3. Outcome statement: "Both parties confirm project complete and payment approved"
4. Add parties:
   - sarah@clientco.com (Sarah, client)
   - mike@reviewerco.com (Mike, reviewer)
5. Define conditions:
   - Alex's condition: "Submit final design files via Figma link"
   - Sarah's condition: "Review and formally accept final deliverables"
   - Mike's condition: "Confirm quality review complete"
6. Click Submit → "Invites sent"

"Three people. Three obligations. One shared outcome."

---

**Act 3: Parties Accept (1:10 — 1:35)**

Split screen or fast tab switching:
- Sarah receives invite email → clicks link → sees her condition ("Review and accept deliverables") → clicks "Accept" → green tick appears on Alex's dashboard
- Mike does the same → second green tick

"All parties accepted. Pact is now Active. Everyone is committed."

Cut back to Pact detail view. All three parties showing "Accepted." Conditions all showing "Pending."

---

**Act 4: The Execution (1:35 — 2:20)**

This is the demo centrepiece. Stage it carefully.

Two browser windows side by side: Alex's view (left) and Sarah's view (right).

- Alex clicks "Mark as Fulfilled" on his condition. Adds note: "Figma link: figma.com/…". Confirms.
- Left: Alex's condition flips to green immediately. "2 of 3 conditions pending."
- Right: Sarah's view → Alex's condition animates to green in real time. SSE event received.
- Mike fulfils his condition (third tab). "1 of 3 conditions pending."
- Sarah clicks "Mark as Fulfilled" on her condition. Confirms.
- **Both screens simultaneously:** Execution animation fires. Status badge pulses, fills green. "PACT EXECUTED."
- Audit timeline auto-scrolls to show execution event with timestamp.

"That moment — simultaneous on both screens — is guaranteed by Aurora DSQL's distributed ACID transaction. The Pact did not execute on one screen and then the other. It executed everywhere, atomically, at the same time."

---

**Act 5: Architecture (2:20 — 2:45)**

Brief cut to architecture diagram (on screen, not narrated at length):

"Aurora DSQL is active-active multi-region. Every write — from any country — hits a DSQL region and is immediately consistent globally. When that last condition was fulfilled, a single ACID transaction fired: conditions updated, Pact marked executed, audit log written. All or nothing. No eventual consistency. No partial state."

Show the DSQL console briefly or the storage configuration screenshot.

---

**Act 6: Proof (2:45 — 3:00)**

Pull up the Execution Receipt URL (`/pacts/[id]/receipt`).

"Here is the public execution receipt. Shareable. Tamper-evident. The audit trail is hash-chained — each entry hashes the previous one. You cannot alter the history without invalidating every subsequent hash."

Show the execution hash. Show the timeline.

"This is what Pact replaces the email chain with."

Cut to logo. Done.

---

## 15. Architecture Diagram Specification

### What To Draw (For Submission)

Create in Excalidraw, draw.io, or Figma. Export as PNG. This is a hackathon submission requirement.

**Components to show (left to right / top to bottom):**

```
┌──────────────────────────────────────────────────────────────────┐
│                      USER LAYER                                  │
│  [Browser: Party A - Lagos]  [Browser: Party B - London]         │
│  [Browser: Party C - New York]                                    │
└────────────────────────┬─────────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼─────────────────────────────────────────┐
│                   VERCEL PLATFORM                                 │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │            Next.js 14 Application                       │     │
│  │   Page Routes        │    API Route Handlers            │     │
│  │   /dashboard         │    POST /api/pacts               │     │
│  │   /pacts/[id]        │    POST /api/conditions/fulfil   │     │
│  │   /pacts/new         │    GET  /api/pacts/[id]/stream   │     │
│  │   /sign-in           │    POST /api/auth/[...nextauth]  │     │
│  └──────────────────────┼──────────────────────────────────┘     │
│                         │                                        │
│  ┌──────────────────────▼──────────────────────────────────┐     │
│  │         Auth.js v5 — self-hosted, no external SaaS      │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  Vercel KV (Redis)                                      │     │
│  │  pub/sub channel per Pact: "pact:{id}"                  │     │
│  │  Decouples SSE from serverless instance — all browsers  │     │
│  │  receive events regardless of which instance handles    │     │
│  │  their connection                                       │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
             │ SQL (TLS)                        │ SMTP/API
┌────────────▼───────────────────┐    ┌────────▼────────┐
│        AURORA DSQL             │    │     RESEND      │
│   (Active-Active Multi-Region) │    │  Magic links +  │
│                                │    │  Notification   │
│   us-east-1 ◄────────► eu-west-1   │  emails         │
│                                │    └─────────────────┘
│   Application tables:          │
│   • pacts                      │
│   • parties                    │
│   • conditions                 │
│   • condition_fulfilments      │
│   • executions  ← UNIQUE       │
│     (pact_id) guarantees one   │
│     execution per Pact at DB   │
│     level                      │
│   • audit_log (hash chain)     │
│   • void_proposals             │
│                                │
│   Auth.js tables (same DB):    │
│   • users                      │
│   • sessions                   │
│   • accounts                   │
│   • verification_tokens        │
└────────────────────────────────┘
```

**Labelling rules:**
- Every box: what it is AND what it does (e.g. "Aurora DSQL — Distributed ACID SQL, active-active multi-region")
- Arrows showing direction of data flow (unidirectional unless genuinely bidirectional)
- Dashed box around AWS services: label "AWS"
- Dashed box around Vercel services: label "Vercel"
- Highlight the DSQL active-active link in a bold colour — this is the architectural differentiator

---

## 16. Submission Checklist

Use this as a pre-submission gate. Every item must be checked before submitting.

### Working Application
- [ ] App is deployed on Vercel and publicly accessible
- [ ] Create Pact flow works end to end
- [ ] Party acceptance via invite link works
- [ ] Condition fulfilment works
- [ ] Pact executes atomically when all conditions met
- [ ] Real-time updates work (SSE) — test from two separate browsers simultaneously
- [ ] Audit trail displays correctly
- [ ] Dashboard loads and filters correctly
- [ ] Landing page exists and looks polished
- [ ] Execution receipt page works and is publicly accessible
- [ ] No broken links or 500 errors on any page

### Aurora DSQL Proof
- [ ] Screenshot of Vercel Storage Configuration showing Aurora DSQL connected
- [ ] Database is genuinely being used (not mocked) — judges may inspect
- [ ] DSQL connection string is in Vercel environment variables (not hardcoded anywhere)
- [ ] At least one multi-table ACID transaction is demonstrably in use (the execution transaction)

### Demo Video (Under 3 Minutes)
- [ ] Video is under 3 minutes — time it exactly
- [ ] Uploaded to YouTube and set to PUBLIC (not unlisted)
- [ ] Explains what problem Pact solves (first 25 seconds)
- [ ] Shows the working application (not slides, not wireframes)
- [ ] Names Aurora DSQL specifically and explains WHY it was chosen
- [ ] Shows the real-time execution moment (the SSE demo)
- [ ] Does NOT contain copyrighted music — use royalty-free or no music

### Architecture Diagram
- [ ] Diagram exists as a PNG or SVG
- [ ] Shows: frontend → Vercel → Aurora DSQL → external services
- [ ] Shows active-active multi-region DSQL configuration
- [ ] Every component labelled with what it is AND what it does
- [ ] Arrows show direction of data flow

### Text Description
- [ ] Clearly states the problem being solved
- [ ] Explicitly names Aurora DSQL as the database used
- [ ] Explains the architectural reason for choosing DSQL
- [ ] Mentions the real-time SSE feature
- [ ] Mentions the atomic execution transaction
- [ ] 300–500 words, clear English

### Vercel Project
- [ ] Project is published and accessible via `*.vercel.app` URL
- [ ] Vercel Team ID noted and ready to submit
- [ ] Environment variables set in Vercel (not in code):
  - `DATABASE_URL` (Aurora DSQL connection string)
  - `AUTH_SECRET` (random 32-char string — `openssl rand -base64 32`)
  - `AUTH_RESEND_KEY` (Resend API key — used by Auth.js for magic links)
  - `AUTH_URL` (your full Vercel deployment URL e.g. `https://pact.vercel.app`)
  - `RESEND_API_KEY` (Resend API key — used for Pact notification emails)
  - `NEXT_PUBLIC_APP_URL` (same as AUTH_URL, used client-side)
  - `KV_URL` (auto-populated when Vercel KV store is connected to project)
  - `KV_REST_API_URL` (auto-populated by Vercel KV)
  - `KV_REST_API_TOKEN` (auto-populated by Vercel KV)

### Code Quality (For Technical Score)
- [ ] No hardcoded credentials anywhere in the codebase
- [ ] `.env.local.example` committed with placeholder values
- [ ] `.env.local` in `.gitignore`
- [ ] TypeScript with strict mode enabled
- [ ] No `any` types on database entities or API responses
- [ ] README.md exists with setup instructions

### Bonus Points
- [ ] Published a blog post or article covering how Pact was built with Aurora DSQL + Vercel
- [ ] Post includes language: "I created this content for the purposes of entering the AWS × Vercel H0 Hackathon"
- [ ] Post shared with hashtag `#H0Hackathon`
- [ ] Link to content submitted with entry

---

## 17. Out of Scope

The following will NOT be built for the hackathon. Any scope creep into these areas wastes time that should go into polish.

| Feature | Why It Is Out of Scope |
|---|---|
| Actual payment processing | Adds Stripe compliance complexity, not needed for demo |
| Legal document generation | Not what Pact is |
| File uploads for condition evidence | Use reference URLs instead — simpler, no blob storage needed |
| Mobile app | Web PWA is sufficient |
| Team/workspace management | Single-user workspaces only |
| API access for developers | Demo the UI, not the API |
| Multi-language support | English only |
| Advanced dispute arbitration | Simple raise + resolve is sufficient |
| Contract templates | Nice to have but not core |
| Notifications via Slack/Teams | Email only |
| Custom domains | Vercel.app URL is fine |
| GDPR/right to erasure | Post-hackathon compliance concern |
| Analytics and reporting | Dashboard is enough |
| Recurring Pacts | One-time Pacts only |

---

## 18. Build Order

### Phase 1 — Foundation (Do First, Everything Else Depends On This)

1. Next.js project setup with TypeScript strict mode
2. Drizzle ORM + Aurora DSQL connection and configuration
3. Run migrations — all tables created (including Auth.js tables: `users`, `sessions`, `accounts`, `verification_tokens`, and application tables including `executions`)
4. Auth.js configured: `auth.ts` with NextAuth + Resend provider + Drizzle adapter, `middleware.ts` protecting all routes except public ones, custom sign-in page built
5. Vercel KV store created and connected to project (3 clicks in Vercel dashboard — env vars auto-injected)
6. Basic layout and navigation components
7. Environment variables verified in Vercel

**Gate:** You must be able to write a record to Aurora DSQL from a deployed Vercel environment before proceeding.

---

### Phase 2 — Core Loop (The Demo Centrepiece)

7. Create Pact API route and form (F-02)
8. Pact detail page — static data, no real-time yet (F-04)
9. Party acceptance flow (F-03)
10. Condition fulfilment API route (F-05)
11. Atomic execution transaction (F-06) — the most important piece, test thoroughly
12. Audit log writing on every state transition (F-08)

**Gate:** You must be able to go from Pact creation → all parties accepting → all conditions fulfilled → Pact executing atomically — all in Aurora DSQL — before adding real-time.

---

### Phase 3 — Real-time and Polish

13. SSE stream endpoint (F-07)
14. Client-side SSE hook and state updates
15. Execution animation on Pact detail page
16. Dashboard with status filtering (F-09)
17. Email notifications via Resend (F-10)

**Gate:** Demo the full flow live in two browsers before doing any visual polish.

---

### Phase 4 — Visual Polish and Submission Assets

18. Landing page (polished, not afterthought)
19. Execution receipt page (F-14 from P1 — this is important for submission)
20. Final visual polish across all pages — typography, spacing, dark theme
21. Architecture diagram
22. Demo video recording
23. Submission text description
24. Screenshots: Storage Configuration, deployed URL
25. Bonus: blog post

---

### Non-Negotiable Rules During Build

- **Test the execution path on every significant change.** The atomic execution is the product. If it breaks, the demo fails.
- **Never hardcode credentials.** Not even temporarily.
- **Keep the P0 scope locked.** Anything not on the P0 list is out of scope until Phase 4 is done.
- **Deploy to Vercel early and often.** Local-only demos have broken on the day too many times.
- **Two-browser testing from Phase 3 onward.** The SSE real-time demo requires it and you need to know it works before recording.
- **Record the demo video last**, after everything is stable. Re-record if anything goes wrong during recording — never submit with a broken moment.
- **Seed realistic demo data** before recording. Real-sounding names and scenarios. Not "test user 1" and "condition 1."

---

*End of PRD v1.0*
*Build something you would actually use.*
