import { auth } from '@/auth'
import { acceptParty } from '@/lib/db/queries/pacts'
import { AppError } from '@/lib/errors'
import { z } from 'zod'

const acceptBody = z.object({
  inviteToken: z.string().min(1),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // params is awaited but id isn't used — token uniquely identifies the party
  await params

  const parsed = acceptBody.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  try {
    const result = await acceptParty(
      parsed.data.inviteToken,
      session.user.id,
      session.user.name ?? null,
    )
    return Response.json(result)
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/pacts/[id]/accept error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
