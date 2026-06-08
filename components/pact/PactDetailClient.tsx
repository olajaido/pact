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

  const handleEvent = useCallback((event: PactSSEEvent) => {
    switch (event.type) {
      case 'PARTY_ACCEPTED':
        setState((p) => ({
          ...p,
          parties: p.parties.map((x) => x.id === event.partyId ? { ...x, accepted: true } : x),
        }))
        break
      case 'PACT_ACTIVATED':
        setState((p) => ({ ...p, pact: { ...p.pact, status: 'ACTIVE' } }))
        break
      case 'CONDITION_FULFILLED':
        setState((p) => ({
          ...p,
          conditions: p.conditions.map((c) =>
            c.id === event.conditionId
              ? { ...c, status: 'FULFILLED', fulfilledAt: new Date(event.timestamp) }
              : c,
          ),
        }))
        break
      case 'PACT_EXECUTED':
        setState((p) => ({
          ...p,
          pact: { ...p.pact, status: 'EXECUTED', executedAt: new Date(event.executedAt) },
          justExecuted: true,
        }))
        break
    }
  }, [])

  usePactStream(pactId, handleEvent)

  useEffect(() => {
    if (!state.justExecuted) return
    const t = setTimeout(() => router.refresh(), 2500)
    return () => clearTimeout(t)
  }, [state.justExecuted, router])

  useEffect(() => {
    if (!state.justExecuted) return
    const t = setTimeout(() => setState((p) => ({ ...p, justExecuted: false })), 1500)
    return () => clearTimeout(t)
  }, [state.justExecuted])

  useEffect(() => {
    if (auditRef.current) auditRef.current.scrollTop = auditRef.current.scrollHeight
  }, [state.auditLog.length])

  const partyMap = new Map(state.parties.map((p) => [p.id, p]))

  const statusColor =
    state.pact.status === 'EXECUTED' ? '#c3f400'
    : state.pact.status === 'ACTIVE' ? '#abd600'
    : state.pact.status === 'IN_DISPUTE' ? '#F59E0B'
    : '#c8c6c5'

  return (
    <>
      <ExecutionBanner visible={state.pact.status === 'EXECUTED'} executedAt={state.pact.executedAt} />

      <main
        className="px-margin-desktop py-stack-lg"
        style={{
          paddingTop: state.pact.status === 'EXECUTED' ? 64 : 32,
          transition: 'padding-top 0.4s ease',
          maxWidth: 1280,
        }}
      >
        {/* Header */}
        <div className="mb-stack-lg flex flex-col md:flex-row justify-between items-start md:items-end gap-stack-md">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="font-label-sm text-[10px] rounded px-2 py-1 uppercase tracking-wider"
                style={{
                  background: '#2a2a2a',
                  color: statusColor,
                  transform: state.justExecuted ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.3s ease, color 0.4s ease',
                }}
              >
                {state.pact.status}
              </span>
            </div>
            <h1
              className="text-primary"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(24px, 3vw, 32px)',
                fontWeight: 600,
              }}
            >
              {state.pact.title}
            </h1>
            {state.pact.outcomeStatement && (
              <p className="font-body-md text-on-surface-variant mt-2" style={{ maxWidth: 640 }}>
                {state.pact.outcomeStatement}
              </p>
            )}
          </div>
        </div>

        {/* Two-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left: parties + conditions */}
          <div className="lg:col-span-8 space-y-stack-lg">
            {/* Parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              {state.parties.map((party, idx) => (
                <div
                  key={party.id}
                  className="p-stack-md transition-all duration-300"
                  style={{
                    background: '#201f1f',
                    borderLeft: `2px solid ${party.accepted ? '#c3f400' : '#444933'}`,
                    transition: 'border-left-color 0.4s ease',
                  }}
                >
                  <span
                    className="font-label-sm text-label-sm block mb-2"
                    style={{ color: party.role === 'CREATOR' ? '#c3f400' : '#c4c9ac' }}
                  >
                    PARTY {String.fromCharCode(65 + idx)} ({party.role})
                  </span>
                  <h3
                    className="text-on-surface"
                    style={{ fontFamily: "'Playfair Display', serif", fontSize: 18 }}
                  >
                    {party.displayName ?? party.email}
                  </h3>
                  <div
                    className="mt-3 flex items-center gap-2"
                    style={{ color: party.accepted ? '#abd600' : '#8e9379' }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 16,
                        fontVariationSettings: party.accepted ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {party.accepted ? 'verified' : 'pending'}
                    </span>
                    <span className="font-label-sm text-[10px] uppercase">
                      {party.accepted ? 'Identity Verified' : 'Awaiting Signature'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Conditions */}
            <div
              className="p-stack-lg"
              style={{ background: '#201f1f', position: 'relative', overflow: 'hidden' }}
            >
              <div className="absolute top-0 right-0 p-stack-md opacity-5">
                <span className="material-symbols-outlined" style={{ fontSize: 96 }}>code</span>
              </div>
              <h2
                className="text-on-surface mb-stack-md"
                style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 500 }}
              >
                Obligations &amp; Triggers
              </h2>
              <div className="space-y-stack-md">
                {state.conditions.map((condition, idx) => {
                  const assignedParty = partyMap.get(condition.assignedPartyId)
                  const isAssignedToMe = condition.assignedPartyId === currentParty?.id
                  const canFulfil =
                    isAssignedToMe &&
                    condition.status === 'PENDING' &&
                    state.pact.status === 'ACTIVE'

                  return (
                    <div
                      key={condition.id}
                      className="flex items-start gap-stack-md"
                      style={{
                        borderBottom:
                          idx < state.conditions.length - 1 ? '1px solid #444933' : 'none',
                        paddingBottom: idx < state.conditions.length - 1 ? 16 : 0,
                      }}
                    >
                      <div
                        className="font-mono font-bold flex-shrink-0"
                        style={{
                          color: condition.status === 'FULFILLED' ? '#c3f400' : '#abd600',
                          transition: 'color 0.4s ease',
                        }}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-label-sm text-label-sm uppercase text-on-surface">
                          {condition.title}
                        </h4>
                        {condition.description && (
                          <p className="text-on-surface-variant text-sm mt-1">
                            {condition.description}
                          </p>
                        )}
                        <p className="text-[11px] text-on-surface-variant mt-1 opacity-60">
                          → {assignedParty?.displayName ?? assignedParty?.email ?? 'Unknown'}
                        </p>
                        {canFulfil && (
                          <div className="mt-3">
                            <FulfilButton conditionId={condition.id} pactId={pactId} />
                          </div>
                        )}
                      </div>
                      <span
                        className="font-label-sm text-[10px] uppercase flex-shrink-0"
                        style={{
                          color: condition.status === 'FULFILLED' ? '#c3f400' : '#8e9379',
                          transition: 'color 0.4s ease',
                        }}
                      >
                        {condition.status === 'FULFILLED' ? 'Executed' : 'Awaiting'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: Audit Trail */}
          <div className="lg:col-span-4">
            <div
              className="p-stack-lg flex flex-col sticky"
              style={{
                background: '#201f1f',
                top: 24,
                maxHeight: 'calc(100vh - 120px)',
              }}
            >
              <div
                className="flex items-center justify-between mb-stack-lg pb-stack-md"
                style={{ borderBottom: '1px solid #444933' }}
              >
                <h2
                  className="text-on-surface"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: 18 }}
                >
                  Audit Trail
                </h2>
                <span className="material-symbols-outlined text-primary-fixed">history_edu</span>
              </div>
              <div ref={auditRef} className="flex-grow overflow-y-auto space-y-stack-md pr-2">
                {state.auditLog.map((entry, i) => (
                  <div key={entry.id} className="relative pl-6">
                    {/* Line */}
                    {i < state.auditLog.length - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 8,
                          bottom: -16,
                          width: 1,
                          background: '#444933',
                        }}
                      />
                    )}
                    {/* Dot */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -4,
                        top: 4,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background:
                          entry.eventType === 'PACT_EXECUTED' ? '#c3f400' : '#8e9379',
                      }}
                    />
                    <div className="flex justify-between items-center">
                      <span
                        className="font-label-sm text-[10px] uppercase"
                        style={{
                          color:
                            entry.eventType === 'PACT_EXECUTED' ? '#c3f400' : '#abd600',
                        }}
                      >
                        {entry.eventType.replace(/_/g, ' ')}
                      </span>
                      <span
                        className="text-[10px] text-on-surface-variant font-mono"
                        suppressHydrationWarning
                      >
                        {new Date(entry.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface mt-1">
                      {entry.actorLabel ?? 'system'}
                    </p>
                    {entry.entryHash && (
                      <span className="text-[9px] font-mono text-on-surface-variant break-all opacity-50">
                        hash: {entry.entryHash.slice(0, 8)}…
                      </span>
                    )}
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
