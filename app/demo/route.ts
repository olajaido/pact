import { NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { timingSafeEqual } from 'node:crypto'

// Pre-configured demo account for hackathon judges.
// Access requires ?key=<DEMO_ACCESS_KEY> — set this in Vercel Environment Variables.
// Share the full URL (with key) in your Devpost Testing Instructions.
const DEMO_USER_ID = '9aa15630-862e-4d9c-b194-d974b0eae042'
const DEMO_USER_EMAIL = 'info@j3consult.co.uk'
const DEMO_USER_NAME = 'Pact Demo'

function safeCompare(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a)
    const bBuf = Buffer.from(b)
    if (aBuf.length !== bBuf.length) return false
    return timingSafeEqual(aBuf, bBuf)
  } catch {
    return false
  }
}

export async function GET(req: Request) {
  const demoKey = process.env.DEMO_ACCESS_KEY

  // If no key is configured, the route is disabled
  if (!demoKey) {
    return new Response('Demo access not configured', { status: 404 })
  }

  // Require ?key= matching the env var — timing-safe to prevent brute-force
  const { searchParams } = new URL(req.url)
  const providedKey = searchParams.get('key') ?? ''

  if (!safeCompare(providedKey, demoKey)) {
    return new Response('Not found', { status: 404 })
  }

  const isProd = process.env.NODE_ENV === 'production'
  const cookieName = isProd
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'

  // Mint a session token valid for 7 days (covers the judging period)
  const token = await encode({
    token: {
      sub: DEMO_USER_ID,
      id: DEMO_USER_ID,
      name: DEMO_USER_NAME,
      email: DEMO_USER_EMAIL,
      picture: null,
    },
    secret: process.env.AUTH_SECRET!,
    salt: cookieName,
    maxAge: 7 * 24 * 60 * 60, // 7 days — covers judging period, not 30
  })

  const origin = new URL(req.url).origin
  const response = NextResponse.redirect(new URL('/dashboard', origin))

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  return response
}
