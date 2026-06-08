import crypto from 'node:crypto'
import { db } from '@/lib/db'
import type { DbTransaction } from '@/lib/db'
import { auditLog } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import type { AuditEventType } from '@/lib/db/schema'

// Structural type: both `db` and transaction `tx` satisfy this
type QueryRunner = Pick<typeof db, 'insert' | 'select'>

export interface AuditEntryOptions {
  pactId: string
  eventType: AuditEventType
  actorId?: string | null
  actorLabel?: string | null
  payload?: Record<string, unknown>
}

export function computeHash(data: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
}

async function writeAuditWith(
  runner: QueryRunner,
  options: AuditEntryOptions,
): Promise<void> {
  const {
    pactId,
    eventType,
    actorId = null,
    actorLabel = null,
    payload = null,
  } = options

  const [previous] = await runner
    .select({ entryHash: auditLog.entryHash })
    .from(auditLog)
    .where(eq(auditLog.pactId, pactId))
    .orderBy(desc(auditLog.createdAt))
    .limit(1)

  const previousHash = previous?.entryHash ?? 'GENESIS'

  const entryHash = computeHash({
    pactId,
    eventType,
    actorId,
    actorLabel,
    payload,
    previousHash,
  })

  await runner.insert(auditLog).values({
    pactId,
    eventType,
    actorId,
    actorLabel,
    payload: payload ?? undefined,
    previousHash,
    entryHash,
  })
}

/** Standalone audit write — use outside of transactions */
export async function writeAuditEntry(options: AuditEntryOptions): Promise<void> {
  await writeAuditWith(db, options)
}

/** Transaction-scoped audit write — use inside db.transaction() callbacks */
export async function writeAuditInTx(
  tx: DbTransaction,
  options: AuditEntryOptions,
): Promise<void> {
  await writeAuditWith(tx as unknown as QueryRunner, options)
}
