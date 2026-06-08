import { auth } from '@/auth'
import { db } from '@/lib/db'
import { parties, pacts } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { acceptParty } from '@/lib/db/queries/pacts'
import { AppError } from '@/lib/errors'

export default async function AcceptPactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { id } = await params
  const { token } = await searchParams

  if (!token) {
    return (
      <main style={mainStyle}>
        <p>Invalid invite link — missing token.</p>
      </main>
    )
  }

  // Look up party by token — no auth required to view the invite summary
  const [party] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.inviteToken, token), eq(parties.pactId, id)))
    .limit(1)

  if (!party) {
    return (
      <main style={mainStyle}>
        <p>Invite link is invalid or has expired.</p>
      </main>
    )
  }

  const [pact] = await db
    .select()
    .from(pacts)
    .where(eq(pacts.id, id))
    .limit(1)

  if (!pact) {
    return (
      <main style={mainStyle}>
        <p>Pact not found.</p>
      </main>
    )
  }

  const session = await auth()

  // Not logged in — prompt sign-in first, redirect back after
  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent(`/pacts/${id}/accept?token=${token}`)
    return (
      <main style={mainStyle}>
        <h1 style={headingStyle}>You&apos;ve been invited to a Pact</h1>
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>{pact.title}</h2>
          <p style={{ color: '#6B7280', margin: 0 }}>{pact.outcomeStatement}</p>
        </div>
        <p style={{ color: '#6B7280', marginBottom: 24 }}>
          Sign in to review and accept your obligations.
        </p>
        <a href={`/sign-in?callbackUrl=${callbackUrl}`} style={ctaStyle}>
          Sign in to accept
        </a>
      </main>
    )
  }

  // Already accepted
  if (party.accepted) {
    return (
      <main style={mainStyle}>
        <p>You have already accepted this Pact.</p>
        <a href={`/pacts/${id}`} style={{ color: '#D4FF4F' }}>
          View Pact →
        </a>
      </main>
    )
  }

  // Server Action — accept and redirect to pact detail
  async function handleAccept(formData: FormData) {
    'use server'
    const inviteToken = formData.get('inviteToken') as string
    const pactId = formData.get('pactId') as string
    const currentSession = await auth()
    if (!currentSession?.user?.id) redirect('/sign-in')

    try {
      await acceptParty(
        inviteToken,
        currentSession.user.id,
        currentSession.user.name ?? null,
      )
    } catch (err) {
      // If already accepted, just redirect to the pact
      if (err instanceof AppError && err.statusCode === 400) {
        redirect(`/pacts/${pactId}`)
      }
      throw err
    }

    redirect(`/pacts/${pactId}`)
  }

  return (
    <main style={mainStyle}>
      <h1 style={headingStyle}>You&apos;ve been invited to a Pact</h1>

      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>{pact.title}</h2>
        {pact.description && (
          <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 8px' }}>
            {pact.description}
          </p>
        )}
        <p style={{ margin: 0 }}>
          <strong>Outcome:</strong> {pact.outcomeStatement}
        </p>
      </div>

      <p style={{ color: '#6B7280', margin: '0 0 24px' }}>
        Accepting as:{' '}
        <strong style={{ color: '#F0EFE8' }}>{session.user.email}</strong>
      </p>

      <form action={handleAccept}>
        <input type="hidden" name="inviteToken" value={token} />
        <input type="hidden" name="pactId" value={id} />
        <button type="submit" style={ctaStyle}>
          Accept and join this Pact
        </button>
      </form>
    </main>
  )
}

// ─── Shared styles ───────────────────────────────────────────

const mainStyle: React.CSSProperties = {
  padding: 32,
  fontFamily: 'IBM Plex Sans, sans-serif',
  color: '#F0EFE8',
  background: '#0C0C0E',
  minHeight: '100vh',
  maxWidth: 600,
  margin: '0 auto',
}

const headingStyle: React.CSSProperties = {
  fontFamily: 'DM Serif Display, serif',
  fontSize: 28,
  marginBottom: 16,
}

const cardStyle: React.CSSProperties = {
  background: '#141416',
  border: '1px solid #242428',
  borderRadius: 8,
  padding: 20,
  marginBottom: 24,
}

const ctaStyle: React.CSSProperties = {
  display: 'inline-block',
  background: '#D4FF4F',
  color: '#0C0C0E',
  padding: '12px 24px',
  borderRadius: 6,
  fontWeight: 700,
  fontSize: 16,
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
}
