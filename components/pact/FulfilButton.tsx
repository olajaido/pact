'use client'

import { useState } from 'react'

interface FulfilButtonProps {
  conditionId: string
  pactId: string
}

export function FulfilButton({ conditionId, pactId }: FulfilButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/conditions/${conditionId}/fulfil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        setError(body.error ?? 'Failed to fulfil condition')
        return
      }
      // SSE event drives the UI update in PactDetailClient — no reload needed
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          background: '#D4FF4F',
          color: '#0C0C0E',
          padding: '8px 16px',
          border: 'none',
          borderRadius: 4,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {loading ? 'Marking…' : 'Mark as Fulfilled'}
      </button>
      {error && (
        <p style={{ color: '#EF4444', marginTop: 4, fontSize: 12 }}>{error}</p>
      )}
    </div>
  )
}
