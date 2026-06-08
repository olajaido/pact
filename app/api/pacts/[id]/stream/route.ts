import { type NextRequest } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { parties } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getPactEventsSince } from '@/lib/sse'

// KV lrange requires Node.js runtime; Edge runtime does not support it.
export const runtime = 'nodejs'
// 5 minutes max — enough for any demo session on Vercel Pro.
export const maxDuration = 300

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorised', { status: 401 })
  }

  const { id: pactId } = await params

  // Verify the caller is a party to this pact before opening the stream
  const [party] = await db
    .select({ id: parties.id })
    .from(parties)
    .where(
      and(eq(parties.pactId, pactId), eq(parties.userId, session.user.id)),
    )
    .limit(1)

  if (!party) {
    return new Response('Forbidden', { status: 403 })
  }

  const encoder = new TextEncoder()
  let cursor = 0
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Confirm connection immediately
      send({ type: 'CONNECTED' })

      async function poll() {
        if (closed) return
        try {
          const { events, nextIndex } = await getPactEventsSince(pactId, cursor)
          cursor = nextIndex
          for (const event of events) {
            if (closed) return
            send(event)
          }
        } catch {
          // KV unavailable — keep connection alive, retry next tick
        }
        if (!closed) setTimeout(poll, 1000)
      }

      // First poll after 500ms to catch events broadcast just before stream opened
      setTimeout(poll, 500)

      // Close cleanly when client disconnects
      req.signal.addEventListener('abort', () => {
        closed = true
        try {
          controller.close()
        } catch {
          // Already closed — ignore
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
