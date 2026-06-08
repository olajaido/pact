import { auth } from '@/auth'
import { fulfilConditionByParty } from '@/lib/db/queries/conditions'
import { attemptPactExecution } from '@/lib/execution'
import { broadcastPactEvent } from '@/lib/sse'
import { sendFulfilledEmails, sendExecutionEmails } from '@/lib/email/send'
import { AppError } from '@/lib/errors'
import { z } from 'zod'

const fulfilBody = z.object({
  idempotencyKey: z.string().uuid(),
  note: z.string().max(500).optional(),
  referenceUrl: z.string().url().optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const parsed = fulfilBody.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { id: conditionId } = await params

  try {
    const { pactId } = await fulfilConditionByParty(
      conditionId,
      session.user.id,
      session.user.name ?? null,
      parsed.data,
    )

    // Broadcast + email after fulfilment DB commit — all non-blocking, best-effort
    void broadcastPactEvent(pactId, {
      type: 'CONDITION_FULFILLED',
      conditionId,
      timestamp: new Date().toISOString(),
    }).catch(console.error)

    void sendFulfilledEmails(pactId, conditionId, session.user.id).catch(console.error)

    const { executed, executionHash } = await attemptPactExecution(
      pactId,
      session.user.id,
    )

    if (executed && executionHash) {
      void broadcastPactEvent(pactId, {
        type: 'PACT_EXECUTED',
        executedAt: new Date().toISOString(),
        executionHash,
      }).catch(console.error)

      void sendExecutionEmails(pactId, executionHash).catch(console.error)
    }

    return Response.json({ pactId, conditionId, pactExecuted: executed, executionHash })
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/conditions/[id]/fulfil error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
