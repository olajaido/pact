import { Resend } from 'resend'

// Returns null when API key is not configured — callers must check before sending
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// usepact.dev is verified in Resend — used for all environments.
export const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? 'Pact Protocol <noreply@usepact.dev>'
