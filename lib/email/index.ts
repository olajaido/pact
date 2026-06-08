import { Resend } from 'resend'

// Returns null when API key is not configured — callers must check before sending
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Using Resend's test address — replace with verified domain address before production
export const FROM_ADDRESS = 'onboarding@resend.dev'
