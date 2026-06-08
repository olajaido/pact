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
    const digest = (err as { digest?: string })?.digest
    if (digest?.startsWith('NEXT_REDIRECT')) throw err
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
      className="flex items-center justify-center min-h-screen px-margin-mobile"
      style={{ background: '#0A0A0A' }}
    >
      <div className="w-full" style={{ maxWidth: 400 }}>
        {/* Logo */}
        <div className="text-center mb-12">
          <h1
            className="font-bold text-on-surface mb-2"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: 32 }}
          >
            Pact Protocol
          </h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant opacity-60 tracking-widest">
            VERIFIED LEGAL NODE
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-8"
          style={{ background: '#201f1f', border: '1px solid rgba(68,73,51,0.3)' }}
        >
          <div className="flex items-center gap-2 text-surface-tint mb-4">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
            >
              security
            </span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest">
              Secure Authentication
            </span>
          </div>

          <h2
            className="text-primary mb-2"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 500 }}
          >
            Sign in
          </h2>
          <p className="font-body-md text-on-surface-variant mb-6">
            Enter your email — we&apos;ll send a magic link. No password needed.
          </p>

          {error && (
            <div
              className="rounded-lg p-4 mb-5 font-body-md"
              style={{
                background: 'rgba(255,180,171,0.1)',
                border: '1px solid rgba(255,180,171,0.3)',
                color: '#ffb4ab',
                fontSize: 13,
              }}
            >
              Could not send magic link. Please check your email and try again.
            </div>
          )}

          <form action={handleSignIn}>
            <div className="mb-6">
              <label
                htmlFor="email"
                className="block font-label-sm text-label-sm text-on-surface-variant mb-2 uppercase tracking-widest"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                className="input-underline"
              />
            </div>
            <SignInSubmitButton />
          </form>
        </div>

        <p className="text-center font-label-sm text-label-sm text-on-surface-variant opacity-60 mt-6">
          By signing in you agree to our terms of service.
        </p>
      </div>
    </main>
  )
}
