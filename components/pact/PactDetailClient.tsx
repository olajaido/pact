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

export function PactDetailClient({ pactId, initialData }: Props) {
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

  // Stable event handler — empty deps + functional setState always reads current state
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
  }, []) // Empty deps — functional setState handles current state safely

  usePactStream(pactId, handleEvent)

  // After animation plays, refresh server state to get full audit log + execution hash
  useEffect(() => {
    if (!state.justExecuted) return
    const timer = setTimeout(() => router.refresh(), 2500)
    return () => clearTimeout(timer)
  }, [state.justExecuted, router])

  // Reset scale animation flag after it plays
  useEffect(() => {
    if (!state.justExecuted) return
    const timer = setTimeout(
      () => setState((prev) => ({ ...prev, justExecuted: false })),
      1500,
    )
    return () => clearTimeout(timer)
  }, [state.justExecuted])

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
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>
                      {party.displayName ?? party.email}
                    </span>
                    <span
                      style={{ color: '#6B7280', marginLeft: 8, fontSize: 12 }}
                    >
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
    </>
  )
}
