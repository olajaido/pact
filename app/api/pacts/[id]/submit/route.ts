import { auth } from '@/auth'
import { submitPact } from '@/lib/db/queries/pacts'
import { AppError } from '@/lib/errors'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id: pactId } = await params

  try {
    const pact = await submitPact(pactId, session.user.id, session.user.name ?? null)
    return Response.json({ pact })
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('POST /api/pacts/[id]/submit error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
