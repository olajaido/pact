# Pact — Commitments that execute themselves.

> **Multi-party commitment execution platform** · AWS × Vercel H0 Hackathon · Track 2 (B2B)

[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://pact-wine.vercel.app)
[![Database](https://img.shields.io/badge/Database-Aurora%20DSQL-orange?logo=amazonaws)](https://aws.amazon.com/rds/aurora/dsql/)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2016-black?logo=next.js)](https://nextjs.org)

**Live demo:** [pact-wine.vercel.app](https://pact-wine.vercel.app)

---

## What is Pact?

Pact is a programmable handshake. When Party A does their part **AND** Party B does their part, something happens automatically — both parties see it simultaneously, no one has to chase anyone, and there is an immutable cryptographic record of everything.

**Real-world problems Pact solves:**
- Freelancer submits deliverable → Client formally accepts → Project closes with full audit trail
- Vendor confirms shipment → Buyer confirms receipt → Invoice auto-approved
- Agency reaches milestone → Client signs off → Next project phase unlocks

The mental model: Pact is to business coordination what Stripe is to payments.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  VERCEL PLATFORM                 │
│                                                  │
│   Next.js 16 App Router                          │
│   ├── Server Components (data fetching)          │
│   ├── Client Components (SSE real-time UI)       │
│   ├── API Routes (pacts, conditions, stream)     │
│   └── Auth.js v5 (magic link via Resend)         │
│                                                  │
│   Vercel KV (Upstash Redis)                      │
│   └── SSE event queue — cross-instance fan-out   │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │     AURORA DSQL         │
          │  Active-Active Multi-   │
          │  Region · ACID · OCC    │
          │                         │
          │  us-east-1 ◄──► eu-west │
          └────────────┬────────────┘
                       │
              ┌────────▼────────┐
              │     RESEND      │
              │  Email delivery │
              │  usepact.dev    │
              └─────────────────┘
```

### Why Aurora DSQL?

The core scenario that demands DSQL: two parties in different regions simultaneously mark their conditions as fulfilled. The system must determine — with global consistency — whether ALL conditions are now met, and if so, execute the pact atomically.

**Traditional Aurora PostgreSQL fails here** — it has a single primary writer region. Under concurrent multi-region writes, you cannot guarantee the "are all conditions fulfilled?" check sees a globally consistent view.

**Aurora DSQL solves this:**
- **Active-active multi-region writes** — any party writes to their nearest region
- **OCC (Optimistic Concurrency Control)** — no locks, no deadlocks; conflicts resolved at commit time
- **ACID transactions** — the execution is one atomic commit across all tables
- **OIDC IAM authentication** — no static passwords; credentials via Vercel OIDC token exchange
- **UNIQUE(pact_id) on executions** — database-level idempotency guarantee; a pact can execute exactly once regardless of concurrent requests

> "The moment of execution must be simultaneous and permanent for all parties regardless of where they are. Aurora DSQL is the only AWS database that guarantees this with SQL and ACID semantics."

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 App Router | Server Components + API routes collocated |
| Language | TypeScript (strict) | Type safety on state-machine data |
| Database | Amazon Aurora DSQL | Distributed ACID, active-active multi-region |
| ORM | Drizzle ORM | TypeScript-first, DSQL-compatible |
| Auth | Auth.js v5 + Resend | Magic link, no passwords, sessions in DSQL |
| Real-time | Vercel KV + SSE | Cross-instance event fan-out via Redis list |
| Email | Resend + React Email | Branded templates, usepact.dev domain |
| Styling | Tailwind CSS v4 | Custom design system (Vibrant Authority) |
| Fonts | Playfair Display + Hanken Grotesk | Via `next/font/google` |
| Deployment | Vercel | OIDC integration with AWS for credential-free DSQL auth |

---

## Key Features

### Atomic Execution Transaction
The most critical piece. When the last condition is fulfilled, a single ACID transaction fires:
1. Check pact is `ACTIVE` — read-only pre-flight
2. `UPDATE pacts SET status = 'EXECUTED' WHERE status = 'ACTIVE'` — race guard
3. `INSERT INTO executions` — `UNIQUE(pact_id)` is the database-level idempotency guarantee
4. `INSERT INTO audit_log` with SHA-256 hash chain entry
5. Commit
6. Post-commit: broadcast SSE event + send execution emails (never inside the transaction)

### OCC Retry Wrapper
Every write transaction is wrapped with exponential backoff for DSQL's OCC conflicts:
```typescript
// Catches: 40001 (PostgreSQL serialization), OC000 (DSQL row conflict), OC001 (schema version)
await withDsqlRetry(() => db.transaction(async (tx) => { ... }))
```

### Tamper-Evident Audit Chain
Every event is SHA-256 hashed including the previous entry's hash. Altering any entry invalidates every subsequent hash — cryptographic proof of the complete timeline.

### Real-time SSE via Vercel KV
Vercel serverless functions are stateless. An in-memory Map breaks across function instances. Vercel KV (Redis) acts as the cross-instance event queue: `rpush` on publish, `lrange` polling on the SSE stream endpoint.

---

## Project Structure

```
pact/
├── app/
│   ├── (auth)/sign-in/        # Magic link sign-in (no Auth.js default UI)
│   ├── (auth)/verify/         # "Check your email" page
│   ├── api/pacts/             # CRUD + SSE stream
│   ├── api/conditions/        # Condition fulfilment
│   ├── dashboard/             # User's pact overview
│   ├── pacts/[id]/            # Detail, accept, receipt pages
│   ├── pacts/new/             # Multi-step create form
│   ├── privacy/               # Privacy policy
│   └── terms/                 # Terms of service
├── lib/
│   ├── db/
│   │   ├── index.ts           # AuroraDSQLPool + OIDC credentials
│   │   ├── schema.ts          # 11 tables, all indexes and constraints
│   │   └── queries/           # Typed query helpers
│   ├── audit.ts               # SHA-256 hash chain writer
│   ├── dsql-retry.ts          # OCC retry wrapper (40001, OC000, OC001)
│   ├── execution.ts           # Atomic pact execution transaction
│   ├── sse.ts                 # KV-backed SSE event queue
│   └── email/                 # Resend templates + send functions
├── components/
│   ├── navigation/            # Sidebar + SidebarLayout
│   ├── pact/                  # PactCard, PactDetailClient, ExecutionBanner, etc.
│   └── forms/                 # CreatePactForm (5-step)
├── hooks/
│   ├── usePactStream.ts       # EventSource lifecycle + auto-reconnect
│   └── useRevealOnScroll.ts   # IntersectionObserver scroll animations
├── auth.ts                    # Auth.js v5 config (root)
├── auth.config.ts             # Edge-compatible auth config (middleware)
├── middleware.ts              # Route protection
└── next.config.ts             # serverExternalPackages for Node.js-only deps
```

---

## Database Schema

11 tables in Aurora DSQL:

| Table | Purpose |
|---|---|
| `users` | User accounts (Auth.js + app) |
| `accounts` | OAuth accounts (Auth.js) |
| `sessions` | Database-backed sessions (Auth.js) |
| `verification_tokens` | Magic link tokens (Auth.js) |
| `pacts` | Core agreement record with state machine |
| `parties` | Participants, roles, invite tokens |
| `conditions` | Obligations assigned to parties |
| `condition_fulfilments` | Evidence when a condition is marked done |
| `executions` | `UNIQUE(pact_id)` — one execution ever |
| `audit_log` | Append-only SHA-256 hash chain |
| `void_proposals` | Per-party void agreement tracking |

**State machine:** `DRAFT → PENDING_ACCEPTANCE → ACTIVE → EXECUTED`

---

## Getting Started

### Prerequisites
- Node.js 18+
- Vercel CLI (`npm i -g vercel`)
- Vercel account with Aurora DSQL and Upstash KV connected
- Resend account with `usepact.dev` (or your own domain) verified

### Environment Variables

```bash
# Aurora DSQL (auto-injected by Vercel DSQL integration)
PGHOST=
PGPORT=5432
PGDATABASE=postgres
PGUSER=admin
PGSSLMODE=require
AWS_REGION=
AWS_ROLE_ARN=
AWS_RESOURCE_ARN=
AWS_ACCOUNT_ID=

# Vercel KV / Upstash (auto-injected when KV store connected)
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Auth.js
AUTH_SECRET=          # openssl rand -base64 32
AUTH_RESEND_KEY=      # Resend API key for magic links
AUTH_URL=             # https://your-deployment.vercel.app

# Email (Resend)
RESEND_API_KEY=       # Resend API key for notification emails
EMAIL_FROM=           # "Pact Protocol <noreply@yourdomain.com>"
NEXT_PUBLIC_APP_URL=  # https://your-deployment.vercel.app
```

### Local Development

```bash
# Clone the repo
git clone https://github.com/olajaido/pact.git
cd pact

# Install dependencies
npm install

# Pull environment variables from Vercel (includes DSQL + KV vars)
vercel link
vercel env pull .env.local

# Add the remaining vars to .env.local manually:
# AUTH_SECRET, AUTH_RESEND_KEY, AUTH_URL, RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_APP_URL

# Start development server (use vercel dev, not npm run dev)
# vercel dev provides VERCEL_OIDC_TOKEN for Aurora DSQL OIDC auth
vercel dev
```

> **Important:** Use `vercel dev` not `npm run dev`. Aurora DSQL authentication uses Vercel OIDC token exchange — `vercel dev` injects `VERCEL_OIDC_TOKEN` automatically. `npm run dev` does not.

### Database Migrations

Migrations are run via the **AWS Query Editor** in the Vercel dashboard (Storage → Aurora DSQL → Query Editor), not via CLI. The Drizzle CLI cannot connect to DSQL locally without live OIDC credentials.

To generate migration SQL after schema changes:
```bash
npm run db:generate
# Then paste the generated SQL from drizzle/migrations/ into the Query Editor
```

### Commands

```bash
npm run dev           # Local dev (use vercel dev instead — see above)
npm run build         # Production build
npm run lint          # ESLint
npm run db:generate   # Generate Drizzle migration SQL
npm run db:studio     # Open Drizzle Studio (visual DB browser)
```

---

## Deployment

The project is connected to Vercel via the Vercel GitHub integration. Every push to `main` triggers a production deployment.

Manual deploy:
```bash
vercel --prod
```

After deployment, update `AUTH_URL` and `NEXT_PUBLIC_APP_URL` in Vercel environment variables to the production URL, then redeploy.

---

## Roadmap (Post-Hackathon)

- **Contract document upload** — PDF upload via Vercel Blob, AI-powered milestone extraction via Claude API
- **Sequential milestone gating** — milestones unlock only when the previous one is executed
- **Webhook triggers** — POST to an external URL on pact execution (payment, workflow automation)
- **API access** — programmatic pact creation for developers
- **Team workspaces** — organisation-level pact management
- **Stripe payment trigger** — release funds on execution

---

## Hackathon Context

Built for the **AWS × Vercel H0 Hackathon** (Track 2 — Monetizable B2B App).

The key architectural decision: Aurora DSQL vs alternatives.

- **vs Aurora PostgreSQL** — single primary writer; cannot guarantee globally-consistent reads during concurrent multi-region writes
- **vs DynamoDB** — excellent for key-value workloads but Pact's domain is fundamentally relational; enforcing referential integrity and hash-chained audit logs requires SQL
- **vs Aurora DSQL** ✓ — active-active multi-region ACID, OCC without deadlocks, OIDC IAM auth, scales to zero

---

## License

MIT

---

*Built on Aurora DSQL · Deployed on Vercel · © 2026 Pact Protocol*
