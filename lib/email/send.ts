import { render } from '@react-email/render'
import { resend, FROM_ADDRESS } from './index'
import { InviteEmail } from './templates/InviteEmail'
import { FulfilledEmail } from './templates/FulfilledEmail'
import { ExecutedEmail } from './templates/ExecutedEmail'
import { DeclineEmail } from './templates/DeclineEmail'
import { db } from '@/lib/db'
import { parties, conditions, pacts, conditionFulfilments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/** Send invite emails to all PARTICIPANT parties after pact submission. */
export async function sendInviteEmails(pactId: string): Promise<void> {
  if (!resend) return

  const [pactRows, partyList, conditionList] = await Promise.all([
    db.select().from(pacts).where(eq(pacts.id, pactId)).limit(1),
    db.select().from(parties).where(eq(parties.pactId, pactId)),
    db.select().from(conditions).where(eq(conditions.pactId, pactId)),
  ])

  const pact = pactRows[0]
  if (!pact) return

  const creator = partyList.find((p) => p.role === 'CREATOR')
  const counterparties = partyList.filter((p) => p.role === 'PARTICIPANT')

  for (const party of counterparties) {
    const partyConds = conditionList.filter(
      (c) => c.assignedPartyId === party.id,
    )
    const firstCond = partyConds[0]
    const acceptUrl = `${appUrl()}/pacts/${pactId}/accept?token=${party.inviteToken}`

    const html = await render(
      InviteEmail({
        pactTitle: pact.title,
        creatorName: creator?.displayName ?? 'Someone',
        outcomeStatement: pact.outcomeStatement,
        conditionTitle: firstCond?.title ?? 'See pact details',
        acceptUrl,
      }),
    )

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: party.email,
      subject: `You've been invited to a Pact: ${pact.title}`,
      html,
    })
  }
}

/** Notify other parties that a condition was fulfilled. */
export async function sendFulfilledEmails(
  pactId: string,
  conditionId: string,
  fulfilledByUserId: string,
): Promise<void> {
  if (!resend) return

  const [pactRows, partyList, conditionList] = await Promise.all([
    db.select().from(pacts).where(eq(pacts.id, pactId)).limit(1),
    db.select().from(parties).where(eq(parties.pactId, pactId)),
    db.select().from(conditions).where(eq(conditions.pactId, pactId)),
  ])

  const pact = pactRows[0]
  const fulfilledCondition = conditionList.find((c) => c.id === conditionId)
  const fulfilledByParty = partyList.find(
    (p) => p.userId === fulfilledByUserId,
  )
  if (!pact || !fulfilledCondition || !fulfilledByParty) return

  const fulfilledCount = conditionList.filter(
    (c) => c.status === 'FULFILLED',
  ).length
  const pactUrl = `${appUrl()}/pacts/${pactId}`

  // Notify all OTHER parties (not the one who fulfilled)
  const recipients = partyList.filter(
    (p) => p.userId !== fulfilledByUserId && p.email,
  )

  for (const party of recipients) {
    const html = await render(
      FulfilledEmail({
        pactTitle: pact.title,
        conditionTitle: fulfilledCondition.title,
        fulfilledByName:
          fulfilledByParty.displayName ?? fulfilledByParty.email,
        totalConditions: conditionList.length,
        fulfilledConditions: fulfilledCount,
        pactUrl,
      }),
    )

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: party.email,
      subject: `Progress update on: ${pact.title}`,
      html,
    })
  }
}

/** Send execution confirmation to all parties. */
export async function sendExecutionEmails(
  pactId: string,
  executionHash: string,
): Promise<void> {
  if (!resend) return

  const [pactRows, partyList] = await Promise.all([
    db.select().from(pacts).where(eq(pacts.id, pactId)).limit(1),
    db.select().from(parties).where(eq(parties.pactId, pactId)),
  ])

  const pact = pactRows[0]
  if (!pact?.executedAt) return

  const receiptUrl = `${appUrl()}/pacts/${pactId}/receipt`

  for (const party of partyList.filter((p) => p.email)) {
    const html = await render(
      ExecutedEmail({
        pactTitle: pact.title,
        outcomeStatement: pact.outcomeStatement,
        executedAt: pact.executedAt.toISOString(),
        receiptUrl,
        executionHash,
      }),
    )

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: party.email,
      subject: `Pact executed: ${pact.title}`,
      html,
    })
  }
}

/** Notify the creator (and all accepted parties) when a party declines. */
export async function sendDeclineNotification(
  pactId: string,
  declinedByEmail: string,
  declinedByName: string,
  reason?: string,
): Promise<void> {
  if (!resend) return

  const [pactRows, partyList] = await Promise.all([
    db.select().from(pacts).where(eq(pacts.id, pactId)).limit(1),
    db.select().from(parties).where(eq(parties.pactId, pactId)),
  ])

  const pact = pactRows[0]
  if (!pact) return

  const url = appUrl()

  // Notify all OTHER parties (not the one who declined)
  const recipients = partyList.filter(
    (p) => p.email.toLowerCase() !== declinedByEmail.toLowerCase() && p.email,
  )

  for (const party of recipients) {
    const html = await render(
      DeclineEmail({
        pactTitle: pact.title,
        declinedByName,
        declinedByEmail,
        reason,
        pactId,
        appUrl: url,
      }),
    )

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: party.email,
      subject: `Pact declined: ${pact.title}`,
      html,
    })
  }
}
