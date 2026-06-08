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
        left: 0,
        right: 0,
        zIndex: 50,
        background: '#22C55E',
        color: '#0C0C0E',
        padding: '14px 32px',
        textAlign: 'center',
        fontWeight: 700,
        fontSize: 16,
        letterSpacing: '0.08em',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <span>PACT EXECUTED</span>
      {ts && (
        <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.75 }}>
          {ts}
        </span>
      )}
    </div>
  )
}
