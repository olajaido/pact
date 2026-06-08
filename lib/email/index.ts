import { Resend } from 'resend'

// Returns null when API key is not configured — callers must check before sending
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export const FROM_ADDRESS = 'noreply@usepact.app'
