import crypto from 'node:crypto'
import { db } from '@/lib/db'
import {
  pacts,
  parties,
  conditions,
  auditLog,
} from '@/lib/db/schema'
import { eq, and, desc, asc, sql, inArray, or, isNull } from 'drizzle-orm'
import { withDsqlRetry } from '@/lib/dsql-retry'
import { writeAuditInTx } from '@/lib/audit'
import { AppError } from '@/lib/errors'
import type { Pact, Party, Condition, AuditLogEntry } from '@/lib/db/schema'

// ─── Types ───────────────────────────────────────────────────

export interface CreatePactInput {
  title: string
  description?: string
  outcomeStatement: string
  /** All parties including creator. Creator identified by matching creatorEmail. */
  parties: Array<{
    email: string
    name: string
    conditions: Array<{ title: string; description?: string }>
  }>
  creatorId: string
  creatorEmail: string
  creatorName: string | null
}

export interface PactDetail {
  pact: Pact
  parties: Party[]
  conditions: Condition[]
  auditLog: AuditLogEntry[]
  currentParty: Party | null
}

// ─── createPact ──────────────────────────────────────────────

export async function createPact(input: CreatePactInput) {
  return withDsqlRetry(() =>
    db.transaction(async (tx) => {
      // Insert pact in DRAFT
      const [pact] = await tx
        .insert(pacts)
        .values({
          creatorId: input.creatorId,
          title: input.title,
          description: input.description,
          outcomeStatement: input.outcomeStatement,
          status: 'DRAFT',
        })
        .returning()

      // Insert all parties; mark creator's entry
      const partyValues = input.parties.map((p) => ({
        pactId: pact.id,
        email: p.email.toLowerCase(),
        displayName: p.name,
        role:
          p.email.toLowerCase() === input.creatorEmail.toLowerCase()
            ? ('CREATOR' as const)
            : ('PARTICIPANT' as const),
        accepted:
          p.email.toLowerCase() === input.creatorEmail.toLowerCase(),
        acceptedAt:
          p.email.toLowerCase() === input.creatorEmail.toLowerCase()
            ? new Date()
            : null,
        userId:
          p.email.toLowerCase() === input.creatorEmail.toLowerCase()
            ? input.creatorId
            : null,
        inviteToken: crypto.randomUUID(),
      }))

      const insertedParties = await tx
        .insert(parties)
        .values(partyValues)
        .returning()

      // Map email → party record
      const emailToParty = new Map(
        insertedParties.map((p) => [p.email.toLowerCase(), p]),
      )

      // Insert conditions in display order
      let order = 0
      for (const partyInput of input.parties) {
        const party = emailToParty.get(partyInput.email.toLowerCase())
        if (!party) continue
        for (const cond of partyInput.conditions) {
          await tx.insert(conditions).values({
            pactId: pact.id,
            assignedPartyId: party.id,
            title: cond.title,
            description: cond.description,
            displayOrder: order++,
          })
        }
      }

      // Audit: PACT_CREATED
      await writeAuditInTx(tx, {
        pactId: pact.id,
        eventType: 'PACT_CREATED',
        actorId: input.creatorId,
        actorLabel: input.creatorName,
        payload: { title: pact.title },
      })

      // Audit: PARTY_INVITED for each counterparty
      for (const p of insertedParties) {
        if (p.role === 'PARTICIPANT') {
          await writeAuditInTx(tx, {
            pactId: pact.id,
            eventType: 'PARTY_INVITED',
            actorId: input.creatorId,
            actorLabel: input.creatorName,
            payload: { invitedEmail: p.email, inviteToken: p.inviteToken },
          })
        }
      }

      return { pact, parties: insertedParties }
    }),
  )
}

// ─── submitPact ──────────────────────────────────────────────

export async function submitPact(
  pactId: string,
  userId: string,
  userName: string | null,
) {
  return withDsqlRetry(() =>
    db.transaction(async (tx) => {
      const [pact] = await tx
        .select()
        .from(pacts)
        .where(eq(pacts.id, pactId))
        .limit(1)

      if (!pact) throw new AppError('Pact not found', 404)
      if (pact.creatorId !== userId) throw new AppError('Forbidden', 403)
      if (pact.status !== 'DRAFT')
        throw new AppError('Pact is not in DRAFT status', 400)

      const [updated] = await tx
        .update(pacts)
        .set({ status: 'PENDING_ACCEPTANCE', updatedAt: new Date() })
        .where(eq(pacts.id, pactId))
        .returning()

      await writeAuditInTx(tx, {
        pactId,
        eventType: 'PACT_SUBMITTED',
        actorId: userId,
        actorLabel: userName,
        payload: {},
      })

      return updated
    }),
  )
}

// ─── getPactById ─────────────────────────────────────────────

export async function getPactById(
  pactId: string,
  userId: string | null,
  userEmail?: string,
): Promise<PactDetail | null> {
  const [pact] = await db
    .select()
    .from(pacts)
    .where(eq(pacts.id, pactId))
    .limit(1)

  if (!pact) return null

  const [partyList, conditionList, auditEntries] = await Promise.all([
    db
      .select()
      .from(parties)
      .where(eq(parties.pactId, pactId))
      .orderBy(asc(parties.createdAt)),
    db
      .select()
      .from(conditions)
      .where(eq(conditions.pactId, pactId))
      .orderBy(asc(conditions.displayOrder)),
    db
      .select()
      .from(auditLog)
      .where(eq(auditLog.pactId, pactId))
      .orderBy(asc(auditLog.createdAt)),
  ])

  // Find current party by userId first, then fall back to email match for pending invites
  const currentParty =
    (userId ? partyList.find((p) => p.userId === userId) : null)
    ?? (userEmail ? partyList.find((p) => p.email.toLowerCase() === userEmail.toLowerCase()) ?? null : null)

  return {
    pact,
    parties: partyList,
    conditions: conditionList,
    auditLog: auditEntries,
    currentParty,
  }
}

// ─── listPactsForUser ────────────────────────────────────────

export async function listPactsForUser(userId: string, status?: string) {
  const rows = await db
    .select({ pact: pacts })
    .from(pacts)
    .innerJoin(
      parties,
      and(eq(parties.pactId, pacts.id), eq(parties.userId, userId)),
    )
    .where(status ? eq(pacts.status, status) : undefined)
    .orderBy(desc(pacts.updatedAt))

  // Deduplicate in case the user is multiple parties on the same pact
  const seen = new Set<string>()
  return rows
    .filter((r) => {
      if (seen.has(r.pact.id)) return false
      seen.add(r.pact.id)
      return true
    })
    .map((r) => r.pact)
}

// ─── acceptParty ─────────────────────────────────────────────

export async function acceptParty(
  inviteToken: string,
  userId: string,
  userName: string | null,
) {
  return withDsqlRetry(() =>
    db.transaction(async (tx) => {
      // Find party by invite token
      const [party] = await tx
        .select()
        .from(parties)
        .where(eq(parties.inviteToken, inviteToken))
        .limit(1)

      if (!party) throw new AppError('Invalid invite token', 404)
      if (party.accepted) throw new AppError('Already accepted', 400)

      // Check pact status
      const [pact] = await tx
        .select()
        .from(pacts)
        .where(eq(pacts.id, party.pactId))
        .limit(1)

      if (!pact) throw new AppError('Pact not found', 404)
      if (pact.status !== 'PENDING_ACCEPTANCE') {
        throw new AppError('Pact is not accepting parties right now', 400)
      }

      // Accept the party
      await tx
        .update(parties)
        .set({ accepted: true, userId, acceptedAt: new Date() })
        .where(eq(parties.id, party.id))

      await writeAuditInTx(tx, {
        pactId: pact.id,
        eventType: 'PARTY_ACCEPTED',
        actorId: userId,
        actorLabel: userName,
        payload: { partyId: party.id, email: party.email },
      })

      // Check if all parties have now accepted
      const [{ pendingCount }] = await tx
        .select({ pendingCount: sql<number>`count(*)::int` })
        .from(parties)
        .where(and(eq(parties.pactId, pact.id), eq(parties.accepted, false)))

      if (pendingCount === 0) {
        await tx
          .update(pacts)
          .set({ status: 'ACTIVE', updatedAt: new Date() })
          .where(eq(pacts.id, pact.id))

        await writeAuditInTx(tx, {
          pactId: pact.id,
          eventType: 'PACT_ACTIVATED',
          actorId: null,
          actorLabel: 'system',
          payload: { activatedAt: new Date().toISOString() },
        })

        return { party, pactId: pact.id, pactStatus: 'ACTIVE' as const }
      }

      return {
        party,
        pactId: pact.id,
        pactStatus: 'PENDING_ACCEPTANCE' as const,
      }
    }),
  )
}

// ─── listPactsWithSummary ────────────────────────────────────

export interface PactSummary {
  pact: Pact
  parties: Array<Pick<Party, 'id' | 'displayName' | 'email' | 'userId'>>
  conditionTotal: number
  conditionFulfilled: number
}

export async function listPactsWithSummary(
  userId: string,
  status?: string,
  userEmail?: string,
): Promise<PactSummary[]> {
  // Match pacts where user is a linked party (userId) OR has a pending invite by email
  const partyMatch = userEmail
    ? or(
        eq(parties.userId, userId),
        and(eq(parties.email, userEmail.toLowerCase()), isNull(parties.userId)),
      )
    : eq(parties.userId, userId)

  const pactRows = await db
    .select({ pact: pacts })
    .from(pacts)
    .innerJoin(parties, and(eq(parties.pactId, pacts.id), partyMatch))
    .where(status ? eq(pacts.status, status) : undefined)
    .orderBy(desc(pacts.updatedAt))

  if (pactRows.length === 0) return []

  // Deduplicate — a user who is both creator and counterparty of the same pact
  // will appear in two party rows, causing the join to return the pact twice.
  const seen = new Set<string>()
  const pactList = pactRows
    .filter((r) => {
      if (seen.has(r.pact.id)) return false
      seen.add(r.pact.id)
      return true
    })
    .map((r) => r.pact)

  const pactIds = pactList.map((p) => p.id)

  const [allParties, condCounts] = await Promise.all([
    db
      .select({
        id: parties.id,
        pactId: parties.pactId,
        displayName: parties.displayName,
        email: parties.email,
        userId: parties.userId,
      })
      .from(parties)
      .where(inArray(parties.pactId, pactIds)),

    db
      .select({
        pactId: conditions.pactId,
        total: sql<number>`count(*)::int`,
        fulfilled:
          sql<number>`sum(case when ${conditions.status} = 'FULFILLED' then 1 else 0 end)::int`,
      })
      .from(conditions)
      .where(inArray(conditions.pactId, pactIds))
      .groupBy(conditions.pactId),
  ])

  const partiesByPact = new Map<
    string,
    Array<Pick<Party, 'id' | 'displayName' | 'email' | 'userId'>>
  >()
  for (const p of allParties) {
    const arr = partiesByPact.get(p.pactId) ?? []
    arr.push(p)
    partiesByPact.set(p.pactId, arr)
  }

  const countsByPact = new Map(condCounts.map((c) => [c.pactId, c]))

  return pactList.map((pact) => {
    const counts = countsByPact.get(pact.id) ?? { total: 0, fulfilled: 0 }
    return {
      pact,
      parties: partiesByPact.get(pact.id) ?? [],
      conditionTotal: counts.total,
      conditionFulfilled: counts.fulfilled,
    }
  })
}
