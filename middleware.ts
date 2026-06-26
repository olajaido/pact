import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { NextResponse } from 'next/server'

// Use Edge-compatible config — no Node.js native modules in this import chain
const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = ['/', '/sign-in', '/verify', '/privacy', '/terms', '/demo']

const PUBLIC_PATTERNS = [
  /^\/pacts\/[^/]+\/accept$/,
  /^\/pacts\/[^/]+\/receipt$/,
  /^\/api\/auth\//,
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PATTERNS.some((pattern) => pattern.test(pathname))
}

export default auth((req) => {
  if (!isPublic(req.nextUrl.pathname) && !req.auth) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
