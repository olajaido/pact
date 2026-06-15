import { auth } from '@/auth'
import { db } from '@/lib/db'
import { pacts, parties } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { withDsqlRetry } from '@/lib/dsql-retry'
import { writeAuditInTx } from '@/lib/audit'
import { broadcastPactEvent } from '@/lib/sse'
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
        // Find party by invite token
        const [party] = await tx
          .select()
          .from(parties)
          .where(eq(parties.inviteToken, inviteToken))
          .limit(1)

        if (!party) throw new AppError('Invalid invite token', 404)

        // Check pact exists and is in PENDING_ACCEPTANCE
        const [pact] = await tx
          .select()
          .from(pacts)
          .where(eq(pacts.id, pactId))
          .limit(1)

        if (!pact) throw new AppError('Pact not found', 404)
        if (pact.status !== 'PENDING_ACCEPTANCE') {
          throw new AppError('Pact cannot be declined at this stage', 400)
        }

        // Write VOID_PROPOSED (party declined) to audit — tracks the decline
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

        // Void the pact — it cannot proceed if a party declines
        await tx
          .update(pacts)
          .set({ status: 'VOID', voidedAt: new Date(), updatedAt: new Date() })
          .where(eq(pacts.id, pactId))

        // Write PACT_VOIDED to audit
        await writeAuditInTx(tx, {
          pactId,
          eventType: 'PACT_VOIDED',
          actorId: null,
          actorLabel: 'system',
          payload: {
            reason: 'Party declined the invitation',
            declinedBy: party.email,
          },
        })
      }),
    )

    // Broadcast to all connected parties
    void broadcastPactEvent(pactId, {
      type: 'PACT_VOIDED',
      timestamp: new Date().toISOString(),
    }).catch(console.error)

    return Response.json({ voided: true })
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/pacts/[id]/decline error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
