import { Resend } from 'resend'

// Returns null when API key is not configured — callers must check before sending
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Local dev uses Resend's shared test address (no domain verification needed).
// Production always uses the verified domain address.
export const FROM_ADDRESS =
  process.env.NODE_ENV === 'production'
    ? 'noreply@usepact.app'
    : 'onboarding@resend.dev'
