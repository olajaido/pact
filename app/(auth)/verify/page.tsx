import Link from 'next/link'

export default function VerifyPage() {
  return (
    <main
      className="flex items-center justify-center min-h-screen px-margin-mobile text-center"
      style={{ background: '#0A0A0A' }}
    >
      <div style={{ maxWidth: 440 }}>
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-8 text-primary-fixed font-bold"
          style={{
            background: 'rgba(195,244,0,0.1)',
            border: '2px solid #c3f400',
            fontSize: 24,
          }}
        >
          ✓
        </div>

        <h1
          className="text-on-surface mb-4"
          style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 600 }}
        >
          Check your email
        </h1>
        <p
          className="font-body-lg text-on-surface-variant mb-8"
          style={{ lineHeight: 1.6 }}
        >
          We sent a magic link to your inbox. Click the link to sign in — it expires in 10 minutes.
        </p>

        <div
          className="rounded-xl p-4 mb-8"
          style={{ background: '#201f1f', border: '1px solid rgba(68,73,51,0.3)' }}
        >
          <p className="font-body-md text-on-surface-variant">
            No email? Check your spam folder, or{' '}
            <Link href="/sign-in" className="text-primary-fixed font-bold hover:underline">
              try again
            </Link>
            .
          </p>
        </div>

        <Link
          href="/"
          className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-fixed transition-colors"
        >
          ← Back to Pact
        </Link>
      </div>
    </main>
  )
}
