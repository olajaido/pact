import { auth } from '@/auth'
import { createPact } from '@/lib/db/queries/pacts'
import { AppError } from '@/lib/errors'
import { db } from '@/lib/db'
import { pacts, parties } from '@/lib/db/schema'
import { desc, eq, and } from 'drizzle-orm'
import { z } from 'zod'

const createPactBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  outcomeStatement: z.string().min(1),
  parties: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).max(100),
        conditions: z.array(
          z.object({
            title: z.string().min(1).max(200),
            description: z.string().optional(),
          }),
        ),
      }),
    )
    .min(2)
    .max(5),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const parsed = createPactBody.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  const body = parsed.data

  // Creator must be in the parties list
  const creatorInParties = body.parties.some(
    (p) => p.email.toLowerCase() === session.user.email!.toLowerCase(),
  )
  if (!creatorInParties) {
    return Response.json(
      { error: 'Creator email must be included in the parties list' },
      { status: 400 },
    )
  }

  try {
    const result = await createPact({
      title: body.title,
      description: body.description,
      outcomeStatement: body.outcomeStatement,
      parties: body.parties,
      creatorId: session.user.id,
      creatorEmail: session.user.email!,
      creatorName: session.user.name ?? null,
    })
    return Response.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/pacts error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const rows = await db
    .select({ pact: pacts })
    .from(pacts)
    .innerJoin(
      parties,
      and(eq(parties.pactId, pacts.id), eq(parties.userId, session.user.id)),
    )
    .where(status ? eq(pacts.status, status) : undefined)
    .orderBy(desc(pacts.updatedAt))

  return Response.json({ pacts: rows.map((r) => r.pact) })
}
