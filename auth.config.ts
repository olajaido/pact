import type { NextAuthConfig } from 'next-auth'

// Edge-compatible auth config — no database imports.
// Used by middleware.ts (Edge runtime) and spread into auth.ts (Node.js runtime).
//
// JWT session strategy: session is a signed JWE cookie validated in both runtimes
// without a database lookup. The database adapter in auth.ts still handles users,
// accounts, and verification tokens — just not sessions.
export const authConfig = {
  session: { strategy: 'jwt' as const },
  pages: {
    signIn: '/sign-in',
    verifyRequest: '/verify',
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // On sign-in, embed the database user ID into the token
      if (user?.id) token.id = user.id
      return token
    },
    session({ session, token }) {
      // Expose the user ID on the session object
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
} satisfies NextAuthConfig
