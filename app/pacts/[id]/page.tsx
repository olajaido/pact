import { auth } from '@/auth'
import { getPactById, acceptParty } from '@/lib/db/queries/pacts'
import { notFound, redirect } from 'next/navigation'
import { PactDetailClient } from '@/components/pact/PactDetailClient'
import { SidebarLayout } from '@/components/navigation/SidebarLayout'
import { AppError } from '@/lib/errors'
import { db } from '@/lib/db'
import { pacts, parties as partiesTable } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { withDsqlRetry } from '@/lib/dsql-retry'
import { writeAuditInTx } from '@/lib/audit'
import { broadcastPactEvent } from '@/lib/sse'
import { sendDeclineNotification } from '@/lib/email/send'
import Link from 'next/link'

export default async function PactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')

  const { id } = await params
  // Pass email so invited-but-unaccepted parties are found
  const data = await getPactById(id, session.user.id, session.user.email ?? undefined)
  if (!data) notFound()

  const { pact, parties: partyList, conditions, currentParty } = data

  // ── Invited but not yet accepted ─────────────────────────────
  // currentParty exists (matched by email) but userId not linked yet
  if (currentParty && !currentParty.accepted && !currentParty.userId) {
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

    async function handleDecline(formData: FormData) {
      'use server'
      const inviteToken = formData.get('inviteToken') as string
      // Use `id` from URL params (server-validated) — NOT pactId from formData (user-controlled)
      const reason = (formData.get('reason') as string | null)?.trim() || 'Party declined the invitation'
      const currentSession = await auth()
      if (!currentSession?.user?.id) redirect('/sign-in')

      await withDsqlRetry(() =>
        db.transaction(async (tx) => {
          // Bind token to URL pact id AND session user — prevents IDOR
          const [party] = await tx
            .select()
            .from(partiesTable)
            .where(and(eq(partiesTable.inviteToken, inviteToken), eq(partiesTable.pactId, id)))
            .limit(1)
          if (!party) throw new AppError('Invalid token', 404)

          const isOwner =
            party.userId === currentSession.user.id ||
            party.email.toLowerCase() === (currentSession.user.email ?? '').toLowerCase()
          if (!isOwner) throw new AppError('Forbidden', 403)

          const [pactRecord] = await tx.select().from(pacts).where(eq(pacts.id, id)).limit(1)
          if (!pactRecord || pactRecord.status !== 'PENDING_ACCEPTANCE') {
            throw new AppError('Pact cannot be declined at this stage', 400)
          }

          await writeAuditInTx(tx, {
            pactId: id,
            eventType: 'VOID_PROPOSED',
            actorId: currentSession.user.id,
            actorLabel: currentSession.user.name ?? currentSession.user.email ?? 'Party',
            payload: { action: 'PARTY_DECLINED', email: party.email, reason },
          })

          await tx.update(pacts)
            .set({ status: 'VOID', voidedAt: new Date(), updatedAt: new Date() })
            .where(eq(pacts.id, id))

          await writeAuditInTx(tx, {
            pactId: id,
            eventType: 'PACT_VOIDED',
            actorId: null,
            actorLabel: 'system',
            payload: { reason: 'Party declined', declinedBy: party.email },
          })
        }),
      )

      void broadcastPactEvent(id, { type: 'PACT_VOIDED', timestamp: new Date().toISOString() }).catch(console.error)

      // Email creator and other parties: who declined and why
      void sendDeclineNotification(
        id,
        currentSession.user.email ?? '',
        currentSession.user.name ?? currentSession.user.email ?? 'Party',
        reason,
      ).catch(console.error)

      redirect('/dashboard')
    }

    const myConditions = conditions.filter((c) => c.assignedPartyId === currentParty.id)

    return (
      <SidebarLayout>
        <main
          className="px-margin-desktop py-stack-lg"
          style={{ maxWidth: 800, fontFamily: "'Hanken Grotesk', sans-serif", color: '#e5e2e1' }}
        >
          {/* Invitation banner */}
          <div
            className="rounded-xl p-stack-lg mb-stack-lg"
            style={{ background: 'rgba(171,214,0,0.08)', border: '1px solid rgba(171,214,0,0.3)' }}
          >
            <p
              className="font-label-sm text-label-sm text-primary-fixed-dim mb-2 uppercase tracking-widest"
              style={{ fontSize: 11 }}
            >
              You have been invited
            </p>
            <p className="font-body-md text-on-surface-variant">
              Review the pact details below and accept or decline your participation.
            </p>
          </div>

          {/* Pact title */}
          <h1
            className="text-on-surface mb-2"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 600 }}
          >
            {pact.title}
          </h1>
          {pact.outcomeStatement && (
            <p className="font-body-md text-on-surface-variant mb-stack-lg">{pact.outcomeStatement}</p>
          )}

          {/* Parties */}
          <section
            className="rounded-xl p-stack-md mb-stack-md"
            style={{ background: '#201f1f', border: '1px solid rgba(68,73,51,0.3)' }}
          >
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-stack-md uppercase tracking-widest" style={{ fontSize: 11 }}>
              Parties
            </p>
            {partyList.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(68,73,51,0.2)' }}>
                <span className="text-on-surface font-bold text-sm">{p.displayName ?? p.email}</span>
                <span
                  className="font-label-sm text-label-sm rounded-full px-3 py-1"
                  style={{
                    fontSize: 10,
                    background: p.accepted ? 'rgba(195,244,0,0.1)' : 'rgba(200,198,197,0.08)',
                    color: p.accepted ? '#c3f400' : '#c8c6c5',
                  }}
                >
                  {p.role === 'CREATOR' ? 'CREATOR' : p.accepted ? 'ACCEPTED' : 'PENDING'}
                </span>
              </div>
            ))}
          </section>

          {/* My obligations */}
          {myConditions.length > 0 && (
            <section
              className="rounded-xl p-stack-md mb-stack-lg"
              style={{ background: '#201f1f', border: '1px solid rgba(171,214,0,0.3)' }}
            >
              <p className="font-label-sm text-label-sm text-primary-fixed-dim mb-stack-md uppercase tracking-widest" style={{ fontSize: 11 }}>
                Your obligations
              </p>
              {myConditions.map((c, i) => (
                <div key={c.id} className="flex items-start gap-3 py-2">
                  <span className="font-mono text-primary-fixed-dim text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="text-on-surface font-bold text-sm">{c.title}</p>
                    {c.description && <p className="text-on-surface-variant text-xs mt-1">{c.description}</p>}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Accept / Decline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {/* Accept */}
            <form action={handleAccept}>
              <input type="hidden" name="inviteToken" value={currentParty.inviteToken} />
              <input type="hidden" name="pactId" value={id} />
              <button
                type="submit"
                className="w-full bg-primary-fixed text-on-primary-fixed font-bold py-4 rounded-full font-label-sm text-label-sm glow-hover transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                  handshake
                </span>
                Accept Pact
              </button>
            </form>

            {/* Decline */}
            <form action={handleDecline} className="flex flex-col gap-2">
              <input type="hidden" name="inviteToken" value={currentParty.inviteToken} />
              <input type="hidden" name="pactId" value={id} />
              <input
                name="reason"
                type="text"
                placeholder="Reason for declining (optional)"
                className="input-underline text-sm"
                style={{ fontSize: 13 }}
              />
              <button
                type="submit"
                className="w-full border text-on-surface-variant font-bold py-4 rounded-full font-label-sm text-label-sm transition-all active:scale-95 flex items-center justify-center gap-2 hover:border-error hover:text-error"
                style={{ borderColor: '#8e9379' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  cancel
                </span>
                Decline Pact
              </button>
              <p className="text-center font-label-sm text-on-surface-variant opacity-60" style={{ fontSize: 10 }}>
                Declining will void this pact and notify all parties. This is recorded in the audit trail.
              </p>
            </form>
          </div>
        </main>
      </SidebarLayout>
    )
  }

  // ── Not a party at all ───────────────────────────────────────
  if (!currentParty) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center min-h-screen" style={{ background: '#0A0A0A' }}>
          <div className="text-center">
            <p className="text-on-surface-variant mb-4">You are not a party to this Pact.</p>
            <Link href="/dashboard" className="text-primary-fixed hover:underline font-label-sm text-label-sm">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </SidebarLayout>
    )
  }

  // ── Accepted party — full real-time view ─────────────────────
  return (
    <SidebarLayout>
      <PactDetailClient pactId={id} initialData={data} currentUserId={session.user.id} />
    </SidebarLayout>
  )
}
