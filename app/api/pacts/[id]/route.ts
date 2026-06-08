import { auth } from '@/auth'
import { getPactById } from '@/lib/db/queries/pacts'
import { AppError } from '@/lib/errors'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id: pactId } = await params

  try {
    const detail = await getPactById(pactId, session.user.id)
    if (!detail) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    // Only parties can view a pact detail
    if (!detail.currentParty) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    return Response.json(detail)
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('GET /api/pacts/[id] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
