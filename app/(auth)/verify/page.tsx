export default function VerifyPage() {
  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
        fontFamily: 'var(--font-sans), IBM Plex Sans, sans-serif',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 440 }}>
        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(212,255,79,0.1)',
            border: '2px solid #D4FF4F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px',
            fontSize: 24,
            color: '#D4FF4F',
          }}
        >
          ✓
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-heading), DM Serif Display, serif',
            fontSize: 32,
            fontWeight: 400,
            color: '#F0EFE8',
            margin: '0 0 16px',
          }}
        >
          Check your email
        </h1>
        <p
          style={{
            color: '#6B7280',
            fontSize: 16,
            lineHeight: 1.6,
            margin: '0 0 32px',
          }}
        >
          We sent a magic link to your inbox. Click the link
          to sign in — it expires in 10 minutes.
        </p>

        <div
          style={{
            background: '#141416',
            border: '1px solid #242428',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 32,
          }}
        >
          <p style={{ color: '#6B7280', fontSize: 13, margin: 0 }}>
            No email? Check your spam folder, or{' '}
            <a
              href="/sign-in"
              style={{ color: '#D4FF4F', textDecoration: 'none' }}
            >
              try again with a different address
            </a>
            .
          </p>
        </div>

        <a
          href="/"
          style={{ color: '#6B7280', fontSize: 13, textDecoration: 'none' }}
        >
          ← Back to Pact
        </a>
      </div>
    </main>
  )
}
