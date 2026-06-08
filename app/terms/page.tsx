import Link from 'next/link'

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p style={{ color: '#c4c9ac', fontSize: 13, margin: '0 0 48px' }}>
          Last updated: June 2026
        </p>

        {[
          {
            title: '1. Acceptance of Terms',
            body: 'By accessing or using Pact ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service.',
          },
          {
            title: '2. Description of Service',
            body: 'Pact is a multi-party commitment coordination platform. It allows parties to define obligations, accept them, fulfil them, and trigger a shared outcome automatically when all conditions are met. Pact provides the infrastructure for coordination — it does not constitute legal advice, generate legally binding contracts, or act as an e-signature platform.',
          },
          {
            title: '3. Not Legal Advice',
            body: 'Pact is not a law firm and does not provide legal advice. The commitments created on Pact are not legal contracts under any jurisdiction unless the parties have separately entered into a binding legal agreement that references or incorporates the Pact. Use of the Service does not create an attorney-client relationship.',
          },
          {
            title: '4. User Responsibilities',
            body: 'You are responsible for all content you create on Pact, including the accuracy of obligations and the identity of parties you invite. You must not use Pact for any unlawful purpose, to misrepresent your identity, or to defraud any party.',
          },
          {
            title: '5. Immutable Records',
            body: 'By design, the Pact audit trail is cryptographically hash-chained and append-only. Once a Pact event is committed to the database, it cannot be deleted or altered. You accept this immutability as a feature of the platform.',
          },
          {
            title: '6. Availability',
            body: 'Pact is provided on an "as is" and "as available" basis. We make no warranty that the Service will be uninterrupted, error-free, or meet your specific requirements. The Service is built on Amazon Aurora DSQL and Vercel infrastructure.',
          },
          {
            title: '7. Limitation of Liability',
            body: 'To the maximum extent permitted by law, Pact shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability to you for any claim shall not exceed the amount you have paid us in the preceding twelve months.',
          },
          {
            title: '8. Changes to Terms',
            body: 'We reserve the right to update these terms at any time. Continued use of the Service after changes constitutes acceptance of the updated terms.',
          },
          {
            title: '9. Contact',
            body: 'For questions about these terms, contact: legal@usepact.dev',
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
