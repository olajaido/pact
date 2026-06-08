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
                  background:
                    pact.status === 'EXECUTED' ? '#22C55E' : '#D4FF4F',
                  width: `${progressPct}%`,
                  height: '100%',
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </a>
  )
}
