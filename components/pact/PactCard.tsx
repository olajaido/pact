import Link from 'next/link'
import { PartyAvatar } from './PartyAvatar'
import type { PactSummary } from '@/lib/db/queries/pacts'

export function PactCard({ summary, userEmail }: { summary: PactSummary; userEmail?: string }) {
  const { pact, parties, conditionTotal, conditionFulfilled } = summary

  // Is this an unaccepted invite (party record exists by email but userId not linked yet)?
  const isUnacceptedInvite = userEmail
    ? parties.some((p) => p.email.toLowerCase() === userEmail.toLowerCase() && p.userId === null)
    : false

  const statusColor =
    pact.status === 'EXECUTED' ? '#c3f400'
    : pact.status === 'ACTIVE' ? '#abd600'
    : pact.status === 'IN_DISPUTE' ? '#F59E0B'
    : '#c8c6c5'

  const statusBg =
    pact.status === 'EXECUTED' ? 'rgba(195,244,0,0.12)'
    : pact.status === 'ACTIVE' ? 'rgba(171,214,0,0.1)'
    : pact.status === 'IN_DISPUTE' ? 'rgba(245,158,11,0.12)'
    : 'rgba(200,198,197,0.08)'

  const pct = conditionTotal > 0 ? Math.round((conditionFulfilled / conditionTotal) * 100) : 0

  return (
    <Link href={`/pacts/${pact.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        className="rounded-xl p-stack-lg glow-hover transition-all border border-transparent hover:border-outline-variant"
        style={{ background: '#201f1f', cursor: 'pointer' }}
      >
        {/* Status + date */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="font-label-sm text-label-sm rounded-full px-3 py-1"
            style={{ color: statusColor, background: statusBg }}
          >
            {pact.status}
          </span>
          {isUnacceptedInvite && (
            <span
              className="font-label-sm text-label-sm rounded-full px-2 py-0.5"
              style={{ background: 'rgba(171,214,0,0.15)', color: '#abd600', fontSize: 10 }}
            >
              INVITED
            </span>
          )}
          <span className="font-label-sm text-label-sm text-on-surface-variant opacity-60">
            {new Date(pact.updatedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Title */}
        <h3
          className="text-on-surface mb-stack-sm"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 18, fontWeight: 600, lineHeight: 1.3,
          }}
        >
          {pact.title}
        </h3>

        {/* Avatars */}
        <div className="flex gap-1 mb-stack-md">
          {parties.slice(0, 4).map((p) => (
            <PartyAvatar key={p.id} name={p.displayName ?? p.email} size={28} />
          ))}
          {parties.length > 4 && (
            <div
              className="flex items-center justify-center font-bold text-on-surface-variant"
              style={{ width: 28, height: 28, borderRadius: '50%', background: '#353534', fontSize: 11 }}
            >
              +{parties.length - 4}
            </div>
          )}
        </div>

        {/* Progress */}
        {conditionTotal > 0 && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {conditionFulfilled} of {conditionTotal} conditions met
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{pct}%</span>
            </div>
            <div className="rounded-full overflow-hidden" style={{ height: 3, background: '#353534' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: pact.status === 'EXECUTED' ? '#c3f400' : '#abd600',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
