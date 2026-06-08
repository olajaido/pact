'use client'

interface ExecutionBannerProps {
  visible: boolean
  executedAt?: Date | string | null
}

export function ExecutionBanner({ visible, executedAt }: ExecutionBannerProps) {
  const ts = executedAt ? new Date(executedAt).toLocaleString() : null
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 256,
        right: 0,
        zIndex: 60,
        background: '#c3f400',
        color: '#0A0A0A',
        padding: '12px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.1em',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
      >
        verified
      </span>
      PACT EXECUTED
      {ts && (
        <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.75 }}>{ts}</span>
      )}
    </div>
  )
}
