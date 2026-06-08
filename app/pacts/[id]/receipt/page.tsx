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
        .select({ entryHash: auditLog.entryHash })
        .from(auditLog)
        .where(eq(auditLog.pactId, id))
        .orderBy(desc(auditLog.createdAt))
        .limit(1),
    ])

  const execution = executionRow[0]
  const executionHash =
    execution?.executionHash ?? lastAudit[0]?.entryHash ?? 'N/A'

  return (
    <div style={{ background: '#0C0C0E', minHeight: '100vh', paddingBottom: 64 }}>
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
        {/* Executed badge + title */}
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

        {/* Parties — names only, no emails (public page) */}
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
                <span
                  style={{ color: '#6B7280', marginLeft: 6, fontSize: 12 }}
                >
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
                style={{ borderLeft: '3px solid #22C55E', paddingLeft: 16 }}
              >
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>
                  {condition.title}
                </p>
                {fulfilment?.note && (
                  <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: 13 }}>
                    Note: {fulfilment.note}
                  </p>
                )}
                {fulfilment?.referenceUrl && (() => {
                  // Only render safe http/https URLs — rejects javascript: and other schemes
                  let safeUrl: string | null = null
                  try {
                    const u = new URL(fulfilment.referenceUrl)
                    if (u.protocol === 'https:' || u.protocol === 'http:') {
                      safeUrl = u.toString()
                    }
                  } catch { /* invalid URL — skip */ }

                  return safeUrl ? (
                    <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                      <a
                        href={safeUrl}
                        style={{ color: '#D4FF4F' }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {safeUrl}
                      </a>
                    </p>
                  ) : null
                })()}
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
            <a
              href="/"
              style={{
                color: '#D4FF4F',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
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
