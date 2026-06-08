import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main
      style={{
        background: '#0A0A0A',
        minHeight: '100vh',
        color: '#e5e2e1',
        fontFamily: "'Hanken Grotesk', Arial, sans-serif",
      }}
    >
      {/* Nav */}
      <header
        style={{
          borderBottom: '1px solid rgba(68,73,51,0.3)',
          padding: '20px 64px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 20,
            fontWeight: 700,
            color: '#e5e2e1',
            textDecoration: 'none',
          }}
        >
          Pact
        </Link>
        <Link
          href="/"
          style={{ color: '#c4c9ac', fontSize: 13, textDecoration: 'none' }}
        >
          ← Back to home
        </Link>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 32px' }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 40,
            fontWeight: 600,
            color: '#e5e2e1',
            margin: '0 0 8px',
            letterSpacing: '-0.01em',
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ color: '#c4c9ac', fontSize: 13, margin: '0 0 48px' }}>
          Last updated: June 2026
        </p>

        {[
          {
            title: '1. Information We Collect',
            body: 'Pact collects only the information necessary to provide the service: your email address (used for authentication via magic link), and the content of Pacts you create, including party details, conditions, and audit events. We do not collect payment information, location data, or any information beyond what is required to operate the platform.',
          },
          {
            title: '2. How We Use Your Information',
            body: 'Your email address is used solely to authenticate you via magic link and to send you notifications related to Pacts you are a party to (invitations, condition fulfilments, and execution confirmations). We do not sell, share, or use your data for advertising or marketing purposes.',
          },
          {
            title: '3. Data Storage',
            body: 'All data is stored in Amazon Aurora DSQL, a distributed SQL database deployed on AWS infrastructure. Pact is hosted on Vercel. Your data is processed in accordance with AWS and Vercel\'s respective data processing agreements.',
          },
          {
            title: '4. Audit Trail and Immutability',
            body: 'By design, the Pact audit trail is append-only and cryptographically hash-chained. This means that once a Pact event is recorded, it cannot be altered or deleted. This immutability is a core feature of the platform, not a limitation.',
          },
          {
            title: '5. Cookies and Sessions',
            body: 'Pact uses a single session cookie to maintain your authenticated session. No third-party tracking cookies are used. The session expires when you sign out or after a period of inactivity.',
          },
          {
            title: '6. Data Retention',
            body: 'Pact and all associated audit records are retained indefinitely by default. If you wish to request deletion of your account and associated data, contact us at the address below.',
          },
          {
            title: '7. Contact',
            body: 'For privacy-related requests, contact: privacy@usepact.dev',
          },
        ].map((section) => (
          <section key={section.title} style={{ marginBottom: 40 }}>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 20,
                fontWeight: 600,
                color: '#e5e2e1',
                margin: '0 0 12px',
              }}
            >
              {section.title}
            </h2>
            <p
              style={{
                fontSize: 15,
                color: '#c4c9ac',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </main>
  )
}
