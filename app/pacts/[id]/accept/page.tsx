import { auth } from '@/auth'
import { db } from '@/lib/db'
import { parties, pacts } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { acceptParty } from '@/lib/db/queries/pacts'
import { AppError } from '@/lib/errors'

function CenteredPage({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex items-center justify-center min-h-screen px-margin-mobile text-center"
      style={{ background: '#0A0A0A' }}
    >
      <div style={{ maxWidth: 440 }}>{children}</div>
    </main>
  )
}

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
      <CenteredPage>
        <p className="text-on-surface-variant">Invalid invite link — missing token.</p>
      </CenteredPage>
    )
  }

  const [party] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.inviteToken, token), eq(parties.pactId, id)))
    .limit(1)

  if (!party) {
    return (
      <CenteredPage>
        <p className="text-on-surface-variant">Invite link is invalid or has expired.</p>
      </CenteredPage>
    )
  }

  const [pact] = await db.select().from(pacts).where(eq(pacts.id, id)).limit(1)
  if (!pact) return <CenteredPage><p className="text-on-surface-variant">Pact not found.</p></CenteredPage>

  const session = await auth()

  // Not logged in
  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent(`/pacts/${id}/accept?token=${token}`)
    return (
      <main
        className="flex items-center justify-center min-h-screen px-margin-mobile"
        style={{ background: '#0A0A0A' }}
      >
        <div className="w-full" style={{ maxWidth: 896 }}>
          <header className="text-center flex flex-col items-center gap-stack-sm mb-stack-lg">
            <div className="flex items-center gap-2 text-surface-tint mb-4">
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>security</span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest">Secure Invitation</span>
            </div>
            <h1
              className="text-primary"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 600 }}
            >
              {pact.title}
            </h1>
            <p className="font-body-md text-on-surface-variant">{pact.outcomeStatement}</p>
          </header>
          <div className="flex justify-center">
            <Link
              href={`/sign-in?callbackUrl=${callbackUrl}`}
              className="inline-flex items-center gap-2 bg-primary-fixed text-on-primary-fixed font-bold py-3 px-8 rounded-full font-label-sm text-label-sm glow-hover transition-all"
              style={{ textDecoration: 'none' }}
            >
              Sign in to accept
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Already accepted
  if (party.accepted) {
    return (
      <CenteredPage>
        <p className="text-on-surface-variant mb-4">You have already accepted this Pact.</p>
        <Link href={`/pacts/${id}`} className="text-primary-fixed hover:underline">View Pact →</Link>
      </CenteredPage>
    )
  }

  // Server Action
  async function handleAccept(formData: FormData) {
    'use server'
    const inviteToken = formData.get('inviteToken') as string
    const pactId = formData.get('pactId') as string
    const currentSession = await auth()
    if (!currentSession?.user?.id) redirect('/sign-in')
    try {
      await acceptParty(inviteToken, currentSession.user.id, currentSession.user.name ?? null)
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 400) redirect(`/pacts/${pactId}`)
      throw err
    }
    redirect(`/pacts/${pactId}`)
  }

  return (
    <main
      className="flex items-center justify-center min-h-screen px-margin-mobile"
      style={{ background: '#0A0A0A' }}
    >
      <div className="w-full" style={{ maxWidth: 896 }}>
        {/* Header */}
        <header className="text-center flex flex-col items-center gap-stack-sm mb-stack-lg">
          <div className="flex items-center gap-2 text-surface-tint mb-4">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest">Secure Invitation</span>
          </div>
          <h1
            className="text-primary"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 600 }}
          >
            {pact.title}
          </h1>
        </header>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Left: Details */}
          <div className="md:col-span-8 flex flex-col gap-gutter">
            <section
              className="rounded-xl p-stack-lg glow-hover transition-all"
              style={{ background: '#141414' }}
            >
              <p className="font-body-lg text-on-surface">
                You have been invited to commit to this Pact. Review the terms below before accepting.
              </p>
            </section>

            <section
              className="rounded-xl p-stack-lg relative overflow-hidden"
              style={{
                background: '#1C1C1C',
                border: '1px solid #262626',
                borderLeft: '4px solid #abd600',
              }}
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -mr-16 -mt-16 opacity-5"
                style={{ background: '#c3f400' }}
              />
              <h2
                className="text-primary mb-stack-md flex items-center gap-2 relative z-10"
                style={{ fontFamily: "'Playfair Display', serif", fontSize: 20 }}
              >
                <span className="text-surface-tint font-mono text-sm">01</span>
                The Outcome
              </h2>
              <div
                className="flex items-center gap-4 p-stack-md rounded-lg relative z-10"
                style={{ background: '#141414' }}
              >
                <div
                  className="p-3 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(171,214,0,0.1)' }}
                >
                  <span
                    className="material-symbols-outlined text-surface-tint"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    bolt
                  </span>
                </div>
                <div>
                  <p className="font-bold text-primary">Automatic Execution</p>
                  <p className="text-on-surface-variant mt-1">{pact.outcomeStatement}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right: Actions */}
          <div className="md:col-span-4 flex flex-col gap-gutter">
            <section
              className="rounded-xl p-stack-md sticky top-8"
              style={{ background: '#141414' }}
            >
              <h3 className="font-label-sm text-label-sm text-on-surface-variant mb-stack-md uppercase tracking-widest">
                ACCEPTING AS
              </h3>
              <div
                className="flex items-center gap-3 mb-stack-lg p-stack-md rounded-lg"
                style={{ background: '#1C1C1C', border: '1px solid #262626' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: '#c3f400', color: '#0A0A0A' }}
                >
                  {(session.user.name?.[0] ?? session.user.email?.[0] ?? 'U').toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-primary text-sm">
                    {session.user.name ?? session.user.email}
                  </p>
                  <p className="text-on-surface-variant text-[11px]">{session.user.email}</p>
                </div>
              </div>

              <form action={handleAccept} className="space-y-stack-sm">
                <input type="hidden" name="inviteToken" value={token} />
                <input type="hidden" name="pactId" value={id} />
                <button
                  type="submit"
                  className="w-full bg-primary-fixed text-on-primary-fixed font-bold py-3 rounded-full font-label-sm text-label-sm glow-hover transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
                  >
                    handshake
                  </span>
                  Accept Pact
                </button>
                <p className="text-[11px] text-on-surface-variant text-center opacity-60 pt-1">
                  This action is cryptographically recorded.
                </p>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
