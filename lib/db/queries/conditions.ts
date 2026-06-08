import { db } from '@/lib/db'
import {
  conditions,
  parties,
  conditionFulfilments,
  pacts,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { withDsqlRetry } from '@/lib/dsql-retry'
import { writeAuditInTx } from '@/lib/audit'
import { AppError } from '@/lib/errors'

export interface FulfilConditionInput {
  note?: string
  referenceUrl?: string
  idempotencyKey: string
}

export interface FulfilConditionResult {
  pactId: string
  conditionId: string
}

export async function fulfilConditionByParty(
  conditionId: string,
  userId: string,
  userName: string | null,
  input: FulfilConditionInput,
): Promise<FulfilConditionResult> {
  return withDsqlRetry(() =>
    db.transaction(async (tx) => {
      // Load condition + its assigned party + pact in one query
      const [row] = await tx
        .select({
          condition: conditions,
          party: parties,
          pact: pacts,
        })
        .from(conditions)
        .innerJoin(parties, eq(parties.id, conditions.assignedPartyId))
        .innerJoin(pacts, eq(pacts.id, conditions.pactId))
        .where(eq(conditions.id, conditionId))
        .limit(1)

      if (!row) throw new AppError('Condition not found', 404)
      if (row.party.userId !== userId) {
        throw new AppError('You are not assigned to this condition', 403)
      }
      if (row.condition.status === 'FULFILLED') {
        throw new AppError('Condition is already fulfilled', 400)
      }
      if (row.pact.status !== 'ACTIVE') {
        throw new AppError('Pact is not active', 400)
      }

      // Mark condition fulfilled — WHERE status = 'PENDING' guards against race
      await tx
        .update(conditions)
        .set({
          status: 'FULFILLED',
          fulfilledAt: new Date(),
          idempotencyKey: input.idempotencyKey,
        })
        .where(
          and(
            eq(conditions.id, conditionId),
            eq(conditions.status, 'PENDING'),
          ),
        )

      // Record fulfilment evidence
      await tx.insert(conditionFulfilments).values({
        conditionId,
        partyId: row.party.id,
        note: input.note ?? null,
        referenceUrl: input.referenceUrl ?? null,
      })

      // Write audit entry
      await writeAuditInTx(tx, {
        pactId: row.condition.pactId,
        eventType: 'CONDITION_FULFILLED',
        actorId: userId,
        actorLabel: userName,
        payload: {
          conditionId,
          conditionTitle: row.condition.title,
        },
      })

      return { pactId: row.condition.pactId, conditionId }
    }),
  )
}
