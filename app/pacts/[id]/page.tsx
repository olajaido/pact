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

  const { pact, parties, conditions, auditLog, currentParty } = data

  const partyMap = new Map(parties.map((p) => [p.id, p]))

  const statusColor =
    pact.status === 'EXECUTED'
      ? '#22C55E'
      : pact.status === 'ACTIVE'
        ? '#D4FF4F'
        : pact.status === 'IN_DISPUTE'
          ? '#F59E0B'
          : '#6B7280'

  return (
    <main
      style={{
        padding: 32,
        fontFamily: 'IBM Plex Sans, sans-serif',
        color: '#F0EFE8',
        background: '#0C0C0E',
        minHeight: '100vh',
        maxWidth: 960,
        margin: '0 auto',
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
          {pact.title}
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
          }}
        >
          {pact.status}
        </span>
      </div>

      {/* Outcome statement */}
      {pact.outcomeStatement && (
        <div
          style={{
            background: '#141416',
            border: '1px solid #242428',
            borderRadius: 8,
            padding: 16,
            marginBottom: 32,
          }}
        >
          <p style={{ margin: 0, color: '#6B7280', fontSize: 13 }}>
            Outcome
          </p>
          <p style={{ margin: '4px 0 0', fontWeight: 600 }}>
            {pact.outcomeStatement}
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
            {parties.map((party) => (
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
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>
                    {party.displayName ?? party.email}
                  </span>
                  <span
                    style={{
                      color: '#6B7280',
                      marginLeft: 8,
                      fontSize: 12,
                    }}
                  >
                    {party.role}
                  </span>
                </div>
                <span
                  style={{
                    color: party.accepted ? '#22C55E' : '#F59E0B',
                    fontWeight: 600,
                    fontSize: 12,
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
            {conditions.map((condition) => {
              const assignedParty = partyMap.get(condition.assignedPartyId)
              const isAssignedToMe =
                condition.assignedPartyId === currentParty.id
              const canFulfil =
                isAssignedToMe &&
                condition.status === 'PENDING' &&
                pact.status === 'ACTIVE'

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
                      <p
                        style={{
                          fontSize: 12,
                          color: '#6B7280',
                          margin: '6px 0 0',
                        }}
                      >
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
        </div>

        {/* Right column — Audit Trail */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            Audit Trail
          </h2>
          <div
            style={{
              background: '#141416',
              border: '1px solid #242428',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div style={{ position: 'relative', paddingLeft: 20 }}>
              {auditLog.map((entry, i) => (
                <div
                  key={entry.id}
                  style={{
                    position: 'relative',
                    paddingBottom: i < auditLog.length - 1 ? 20 : 0,
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
                    }}
                  />
                  {i < auditLog.length - 1 && (
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
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: 11,
                      color: '#6B7280',
                    }}
                  >
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
  )
}
