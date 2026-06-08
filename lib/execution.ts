import { db } from '@/lib/db'
import { pacts, conditions, executions, auditLog, parties } from '@/lib/db/schema'
import { eq, and, sql, desc } from 'drizzle-orm'
import { withDsqlRetry } from '@/lib/dsql-retry'
import { computeHash } from '@/lib/audit'

export interface ExecutionResult {
  executed: boolean
  executionHash?: string
}

export async function attemptPactExecution(
  pactId: string,
  triggeringUserId: string,
): Promise<ExecutionResult> {
  // Pre-flight: count pending conditions. Read-only — no transaction needed.
  const [{ pendingCount }] = await db
    .select({ pendingCount: sql<number>`count(*)::int` })
    .from(conditions)
    .where(and(eq(conditions.pactId, pactId), eq(conditions.status, 'PENDING')))

  if (pendingCount > 0) {
    return { executed: false }
  }

  // Atomic execution — OCC retry handles DSQL serialization conflicts
  return withDsqlRetry(async () =>
    db.transaction(async (tx) => {
      // Step 3: Update pact status.
      // WHERE status = 'ACTIVE' is the race guard — if two concurrent fulfilments
      // both pass the pre-flight above, only the first UPDATE wins. The second
      // sees 0 rows updated and returns { executed: false }.
      const updated = await tx
        .update(pacts)
        .set({
          status: 'EXECUTED',
          executedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(pacts.id, pactId), eq(pacts.status, 'ACTIVE')))
        .returning({ id: pacts.id })

      if (updated.length === 0) {
        return { executed: false }
      }

      // Step 4: Build execution payload snapshot
      const [allParties, allConditions] = await Promise.all([
        tx.select().from(parties).where(eq(parties.pactId, pactId)),
        tx.select().from(conditions).where(eq(conditions.pactId, pactId)),
      ])

      const executionPayload = {
        pactId,
        executedAt: new Date().toISOString(),
        triggeredBy: triggeringUserId,
        parties: allParties.map((p) => ({
          id: p.id,
          email: p.email,
          role: p.role,
          displayName: p.displayName,
        })),
        conditions: allConditions.map((c) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          fulfilledAt: c.fulfilledAt?.toISOString() ?? null,
        })),
      }

      const executionHash = computeHash(executionPayload)

      // Step 4b: Insert execution record.
      // UNIQUE(pact_id) is the database-level idempotency guarantee —
      // if this somehow runs twice, the constraint rejects the duplicate
      // rather than creating a second execution record.
      await tx.insert(executions).values({
        pactId,
        executedBy: triggeringUserId,
        executionHash,
        executionPayload,
      })

      // Step 5: Append PACT_EXECUTED to audit log with hash chain.
      // Must be inside the transaction to remain atomic with the pact update.
      const [previousEntry] = await tx
        .select({ entryHash: auditLog.entryHash })
        .from(auditLog)
        .where(eq(auditLog.pactId, pactId))
        .orderBy(desc(auditLog.createdAt))
        .limit(1)

      const previousHash = previousEntry?.entryHash ?? 'GENESIS'

      const entryPayload = {
        executedAt: new Date().toISOString(),
        executionHash,
      }

      const entryHash = computeHash({
        pactId,
        eventType: 'PACT_EXECUTED',
        actorId: null,
        actorLabel: 'system',
        payload: entryPayload,
        previousHash,
      })

      await tx.insert(auditLog).values({
        pactId,
        eventType: 'PACT_EXECUTED',
        actorId: null,
        actorLabel: 'system',
        payload: entryPayload,
        previousHash,
        entryHash,
      })

      return { executed: true, executionHash }
    }),
  )
}
