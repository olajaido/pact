import type { NextAuthConfig } from 'next-auth'

// Edge-compatible auth config — no database imports.
// Used by middleware.ts which runs in the Edge runtime.
// The full config (with DrizzleAdapter + Resend provider) lives in auth.ts
// and is used by API routes which run in the Node.js runtime.
export const authConfig = {
  pages: {
    signIn: '/sign-in',
    verifyRequest: '/verify',
  },
  providers: [], // Providers not needed for Edge session checks
  callbacks: {},
} satisfies NextAuthConfig
