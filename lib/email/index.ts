import { Resend } from 'resend'

// Returns null when API key is not configured — callers must check before sending
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// usepact.dev is the verified production domain.
// Local dev uses Resend's shared test address (no domain verification needed).
export const FROM_ADDRESS =
  process.env.NODE_ENV === 'production'
    ? 'Pact Protocol <noreply@usepact.dev>'
    : 'onboarding@resend.dev'
