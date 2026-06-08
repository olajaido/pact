'use client'

import { useFormStatus } from 'react-dom'

export function SignInSubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: '100%',
        background: pending ? '#242428' : '#D4FF4F',
        color: pending ? '#6B7280' : '#0C0C0E',
        padding: '14px 24px',
        border: 'none',
        borderRadius: 6,
        fontWeight: 700,
        fontSize: 15,
        cursor: pending ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s ease, color 0.15s ease',
        fontFamily: 'inherit',
      }}
    >
      {pending ? 'Sending…' : 'Send magic link'}
    </button>
  )
}
