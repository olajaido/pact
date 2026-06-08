'use client'

import { useFormStatus } from 'react-dom'

export function SignInSubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary-fixed text-on-primary-fixed font-bold py-3 rounded-full font-label-sm text-label-sm flex items-center justify-center gap-2 btn-hover transition-all active:scale-95"
      style={{
        opacity: pending ? 0.6 : 1,
        cursor: pending ? 'not-allowed' : 'pointer',
      }}
    >
      {pending ? (
        'Sending…'
      ) : (
        <>
          Send magic link
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
        </>
      )}
    </button>
  )
}
