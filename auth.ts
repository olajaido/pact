import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { Resend as ResendClient } from 'resend'
import { render } from '@react-email/render'
import { db } from '@/lib/db'
import { accounts, sessions, users, verificationTokens } from '@/lib/db/schema'
import { authConfig } from './auth.config'
import { MagicLinkEmail } from '@/lib/email/templates/MagicLinkEmail'

// usepact.dev is verified in Resend — used everywhere.
const FROM = process.env.EMAIL_FROM ?? 'Pact Protocol <noreply@usepact.dev>'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: FROM,
      sendVerificationRequest: async ({ identifier, url }) => {
        const apiKey = process.env.AUTH_RESEND_KEY
        if (!apiKey) {
          console.warn('[auth] AUTH_RESEND_KEY not set — magic link not sent')
          return
        }
        const html = await render(MagicLinkEmail({ url, email: identifier }))
        const resend = new ResendClient(apiKey)
        await resend.emails.send({
          from: FROM,
          to: identifier,
          subject: 'Your sign-in link for Pact Protocol',
          html,
        })
      },
    }),
  ],
})
