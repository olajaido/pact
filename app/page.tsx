export default function LandingPage() {
  return (
    <div
      style={{
        fontFamily: 'var(--font-sans), IBM Plex Sans, sans-serif',
        color: '#F0EFE8',
        background: '#0C0C0E',
      }}
    >
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 40px',
          height: 60,
          background: 'rgba(12,12,14,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #242428',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-heading), DM Serif Display, serif',
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
        >
          Pact
        </span>
        <a
          href="/sign-in"
          style={{
            color: '#F0EFE8',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Sign in
        </a>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '80px 32px 40px',
        }}
      >
        <p
          style={{
            color: '#D4FF4F',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.2em',
            marginBottom: 32,
            textTransform: 'uppercase',
          }}
        >
          AWS × Vercel Hackathon
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-heading), DM Serif Display, serif',
            fontSize: 'clamp(42px, 7vw, 80px)',
            fontWeight: 400,
            lineHeight: 1.05,
            margin: '0 0 28px',
            maxWidth: 720,
            letterSpacing: '-0.02em',
          }}
        >
          Commitments that<br />execute themselves.
        </h1>
        <p
          style={{
            color: '#6B7280',
            fontSize: 20,
            lineHeight: 1.6,
            maxWidth: 540,
            margin: '0 0 48px',
          }}
        >
          Define obligations. All parties fulfil them.
          The outcome fires atomically — permanent,
          auditable, simultaneous.
        </p>
        <a
          href="/sign-in"
          style={{
            background: '#D4FF4F',
            color: '#0C0C0E',
            padding: '16px 36px',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 16,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Start for free →
        </a>
        <p style={{ color: '#6B7280', fontSize: 12, marginTop: 16 }}>
          No credit card required. Backed by Aurora DSQL.
        </p>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section
        style={{
          padding: '96px 40px',
          borderTop: '1px solid #242428',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p
            style={{
              color: '#6B7280',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: 48,
              textAlign: 'center',
            }}
          >
            How it works
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 2,
            }}
          >
            {[
              {
                num: '01',
                title: 'Create',
                body: 'Define the pact: title, parties, and what each party must fulfil. Invite them with a single link.',
              },
              {
                num: '02',
                title: 'Commit',
                body: 'All parties accept their obligations. The pact activates only when every party has agreed.',
              },
              {
                num: '03',
                title: 'Execute',
                body: 'When the last condition is fulfilled, Aurora DSQL fires a single ACID transaction. The outcome is instant, permanent, and simultaneous for all parties.',
              },
            ].map((step) => (
              <div
                key={step.num}
                style={{
                  background: '#141416',
                  border: '1px solid #242428',
                  padding: 32,
                }}
              >
                <p
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    color: '#D4FF4F',
                    fontSize: 12,
                    fontWeight: 700,
                    margin: '0 0 16px',
                    letterSpacing: '0.1em',
                  }}
                >
                  {step.num}
                </p>
                <h3
                  style={{
                    fontFamily:
                      'var(--font-heading), DM Serif Display, serif',
                    fontSize: 28,
                    fontWeight: 400,
                    margin: '0 0 16px',
                    color: '#F0EFE8',
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    color: '#6B7280',
                    lineHeight: 1.7,
                    margin: 0,
                    fontSize: 15,
                  }}
                >
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ────────────────────────────────────── */}
      <section
        style={{
          padding: '96px 40px',
          borderTop: '1px solid #242428',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p
            style={{
              color: '#6B7280',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: 48,
              textAlign: 'center',
            }}
          >
            Built for
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
            }}
          >
            {[
              {
                label: 'Freelancers',
                headline: 'No more "did you accept this?"',
                body: 'Submit your deliverable. Client accepts. Both parties mark complete. Dispute-proof audit trail included.',
                example: 'Submit design files → Client accepts → Project closes',
              },
              {
                label: 'Vendors',
                headline: 'From delivery to invoice in one step',
                body: 'Vendor confirms shipment. Buyer confirms receipt. Invoice is automatically approved.',
                example:
                  'Confirm shipment → Buyer confirms → Invoice approved',
              },
              {
                label: 'Partnerships',
                headline: 'Both sides committed, or it does not activate',
                body: 'Two business partners both commit to a joint campaign. Agreement activates only when everyone is in.',
                example:
                  'Agency reaches milestone → Client signs off → Next phase unlocks',
              },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  background: '#141416',
                  border: '1px solid #242428',
                  borderRadius: 8,
                  padding: 28,
                }}
              >
                <p
                  style={{
                    color: '#D4FF4F',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    margin: '0 0 12px',
                  }}
                >
                  {card.label}
                </p>
                <h3
                  style={{
                    fontFamily:
                      'var(--font-heading), DM Serif Display, serif',
                    fontSize: 22,
                    fontWeight: 400,
                    margin: '0 0 12px',
                    lineHeight: 1.3,
                  }}
                >
                  {card.headline}
                </h3>
                <p
                  style={{
                    color: '#6B7280',
                    fontSize: 14,
                    lineHeight: 1.6,
                    margin: '0 0 20px',
                  }}
                >
                  {card.body}
                </p>
                <p
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    color: '#22C55E',
                    background: 'rgba(34,197,94,0.08)',
                    padding: '8px 12px',
                    borderRadius: 4,
                    margin: 0,
                  }}
                >
                  {card.example}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────── */}
      <section
        style={{
          borderTop: '1px solid #242428',
          padding: '96px 40px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-heading), DM Serif Display, serif',
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 400,
            margin: '0 0 24px',
            letterSpacing: '-0.02em',
          }}
        >
          Replace the email chain.
        </h2>
        <p style={{ color: '#6B7280', fontSize: 18, margin: '0 0 40px' }}>
          One link. Both sides committed. Automatic execution.
        </p>
        <a
          href="/sign-in"
          style={{
            background: '#D4FF4F',
            color: '#0C0C0E',
            padding: '16px 36px',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 16,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Create your first Pact →
        </a>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid #242428',
          padding: '32px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#6B7280',
          fontSize: 13,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-heading), DM Serif Display, serif',
            fontSize: 18,
          }}
        >
          Pact
        </span>
        <span>
          Built on{' '}
          <strong style={{ color: '#F0EFE8' }}>Aurora DSQL</strong>
          {' '}· Deployed on{' '}
          <strong style={{ color: '#F0EFE8' }}>Vercel</strong>
        </span>
        <span>AWS × Vercel H0 Hackathon</span>
      </footer>
    </div>
  )
}
