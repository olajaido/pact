'use client'

import { useState } from 'react'

interface FulfilButtonProps {
  conditionId: string
  pactId: string
}

export function FulfilButton({ conditionId }: FulfilButtonProps) {
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
      }
      // SSE event drives the UI update in PactDetailClient
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
        className="bg-primary-fixed text-on-primary-fixed font-bold py-2 px-6 rounded-full font-label-sm text-label-sm glow-hover transition-all active:scale-95 flex items-center gap-2"
        style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
          {loading ? 'hourglass_empty' : 'check_circle'}
        </span>
        {loading ? 'Marking…' : 'Mark as Fulfilled'}
      </button>
      {error && (
        <p className="font-label-sm text-label-sm mt-1" style={{ color: '#ffb4ab' }}>
          {error}
        </p>
      )}
    </div>
  )
}
