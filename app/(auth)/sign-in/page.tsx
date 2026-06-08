import { signIn } from '@/auth'
import { redirect } from 'next/navigation'
import { SignInSubmitButton } from '@/components/SignInSubmitButton'

async function handleSignIn(formData: FormData) {
  'use server'
  const email = (formData.get('email') as string | null)?.trim()
  if (!email) return

  try {
    await signIn('resend', { email, redirectTo: '/dashboard' })
  } catch (err: unknown) {
    // Re-throw Next.js redirect errors so navigation proceeds
    const digest = (err as { digest?: string })?.digest
    if (digest?.startsWith('NEXT_REDIRECT')) throw err
    // For real failures (Resend down, invalid config), show error on page
    redirect('/sign-in?error=true')
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
        fontFamily: 'var(--font-sans), IBM Plex Sans, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1
            style={{
              fontFamily: 'var(--font-heading), DM Serif Display, serif',
              fontSize: 36,
              fontWeight: 400,
              color: '#F0EFE8',
              margin: '0 0 8px',
            }}
          >
            Pact
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
            Commitments that execute themselves.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#141416',
            border: '1px solid #242428',
            borderRadius: 8,
            padding: 32,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#F0EFE8',
              margin: '0 0 8px',
            }}
          >
            Sign in
          </h2>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 24px' }}>
            Enter your email — we&apos;ll send a magic link.
            No password needed.
          </p>

          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 6,
                padding: '10px 14px',
                marginBottom: 20,
                color: '#EF4444',
                fontSize: 13,
              }}
            >
              Could not send magic link. Please check your email and try again.
            </div>
          )}

          <form action={handleSignIn}>
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#F0EFE8',
                  marginBottom: 6,
                }}
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  background: '#0C0C0E',
                  border: '1px solid #242428',
                  borderRadius: 6,
                  padding: '12px 14px',
                  color: '#F0EFE8',
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <SignInSubmitButton />
          </form>
        </div>

        <p
          style={{
            textAlign: 'center',
            color: '#6B7280',
            fontSize: 13,
            marginTop: 24,
          }}
        >
          By signing in you agree to our terms of service.
        </p>
      </div>
    </main>
  )
}
