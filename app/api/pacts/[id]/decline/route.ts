import { auth } from '@/auth'
import { db } from '@/lib/db'
import { pacts, parties } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { withDsqlRetry } from '@/lib/dsql-retry'
import { writeAuditInTx } from '@/lib/audit'
import { broadcastPactEvent } from '@/lib/sse'
import { sendDeclineNotification } from '@/lib/email/send'
import { AppError } from '@/lib/errors'
import { z } from 'zod'

const declineBody = z.object({
  inviteToken: z.string().min(1),
  reason: z.string().max(500).optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const parsed = declineBody.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { id: pactId } = await params
  const { inviteToken, reason } = parsed.data

  try {
    await withDsqlRetry(() =>
      db.transaction(async (tx) => {
        // Bind token to BOTH the URL pact id AND the session user's email/id
        // This prevents IDOR: a token from pact A cannot void pact B
        const [party] = await tx
          .select()
          .from(parties)
          .where(
            and(
              eq(parties.inviteToken, inviteToken),
              eq(parties.pactId, pactId), // must belong to THIS pact
            ),
          )
          .limit(1)

        if (!party) throw new AppError('Invalid invite token for this pact', 404)

        // Verify the session user is the invited party
        const isOwner =
          party.userId === session.user.id ||
          party.email.toLowerCase() === (session.user.email ?? '').toLowerCase()

        if (!isOwner) throw new AppError('Forbidden', 403)

        // Check pact is in PENDING_ACCEPTANCE
        const [pact] = await tx
          .select()
          .from(pacts)
          .where(eq(pacts.id, pactId))
          .limit(1)

        if (!pact) throw new AppError('Pact not found', 404)
        if (pact.status !== 'PENDING_ACCEPTANCE') {
          throw new AppError('Pact cannot be declined at this stage', 400)
        }

        // Audit: party declined
        await writeAuditInTx(tx, {
          pactId,
          eventType: 'VOID_PROPOSED',
          actorId: session.user.id,
          actorLabel: session.user.name ?? session.user.email ?? 'Party',
          payload: {
            action: 'PARTY_DECLINED',
            partyId: party.id,
            email: party.email,
            reason: reason ?? 'Party declined the invitation',
          },
        })

        // Void the pact
        await tx
          .update(pacts)
          .set({ status: 'VOID', voidedAt: new Date(), updatedAt: new Date() })
          .where(eq(pacts.id, pactId))

        // Audit: pact voided
        await writeAuditInTx(tx, {
          pactId,
          eventType: 'PACT_VOIDED',
          actorId: null,
          actorLabel: 'system',
          payload: { reason: 'Party declined', declinedBy: party.email },
        })
      }),
    )

    void broadcastPactEvent(pactId, {
      type: 'PACT_VOIDED',
      timestamp: new Date().toISOString(),
    }).catch(console.error)

    // Notify creator and other parties with who declined and why
    void sendDeclineNotification(
      pactId,
      session.user.email ?? '',
      session.user.name ?? session.user.email ?? 'Party',
      reason,
    ).catch(console.error)

    return Response.json({ voided: true })
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/pacts/[id]/decline error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
