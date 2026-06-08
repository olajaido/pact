import { kv } from '@vercel/kv'
import type { PactSSEEvent } from './sse-types'

const eventsKey = (pactId: string) => `pact:events:${pactId}`
const TTL_SECONDS = 4 * 60 * 60 // 4 hours — auto-expires old event lists

function kvConfigured(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN,
  )
}

/** Append an event to this pact's KV event list. Call AFTER every DB commit. */
export async function broadcastPactEvent(
  pactId: string,
  event: PactSSEEvent,
): Promise<void> {
  if (!kvConfigured()) return
  try {
    const key = eventsKey(pactId)
    await kv.rpush(key, JSON.stringify(event))
    await kv.expire(key, TTL_SECONDS)
  } catch (err) {
    console.error('[SSE] broadcast error:', err)
  }
}

/** Read all events appended since fromIndex. Returns events + next cursor. */
export async function getPactEventsSince(
  pactId: string,
  fromIndex: number,
): Promise<{ events: PactSSEEvent[]; nextIndex: number }> {
  if (!kvConfigured()) return { events: [], nextIndex: fromIndex }
  try {
    const key = eventsKey(pactId)
    const items = await kv.lrange<string>(key, fromIndex, -1)
    const events = (items ?? []).map((item) => JSON.parse(item) as PactSSEEvent)
    return { events, nextIndex: fromIndex + events.length }
  } catch (err) {
    console.error('[SSE] poll error:', err)
    return { events: [], nextIndex: fromIndex }
  }
}
