'use client'

import { useEffect } from 'react'
import type { PactSSEEvent } from '@/lib/sse-types'

/**
 * Subscribes to the pact SSE stream. Reconnects automatically on error.
 *
 * IMPORTANT: wrap `onEvent` in useCallback with empty deps at the call site
 * so that the effect does not resubscribe on every render.
 */
export function usePactStream(
  pactId: string,
  onEvent: (event: PactSSEEvent) => void,
): void {
  useEffect(() => {
    let mounted = true
    let eventSource: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (!mounted) return

      eventSource = new EventSource(`/api/pacts/${pactId}/stream`)

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data as string) as PactSSEEvent
          if (event.type !== 'CONNECTED') onEvent(event)
        } catch {
          // Ignore malformed messages
        }
      }

      eventSource.onerror = () => {
        eventSource?.close()
        eventSource = null
        if (mounted) reconnectTimer = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      mounted = false
      eventSource?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [pactId, onEvent]) // onEvent must be stable (useCallback at call site)
}
