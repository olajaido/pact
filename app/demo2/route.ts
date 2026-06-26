import { NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { timingSafeEqual } from 'node:crypto'

// Second demo account for the two-browser simultaneous execution test.
// Browser 1: /demo?key=<KEY>   → info@j3consult.co.uk  (Party A / creator)
// Browser 2: /demo2?key=<KEY>  → engineerj2000@yahoo.com (Party B / counterparty)
const DEMO2_USER_ID = '6b98fdd1-78b4-4618-bcd9-c0270de91f20'
const DEMO2_USER_EMAIL = 'engineerj2000@yahoo.com'
const DEMO2_USER_NAME = 'Pact Demo 2'

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

  if (!demoKey) {
    return new Response('Demo access not configured', { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const providedKey = searchParams.get('key') ?? ''

  if (!safeCompare(providedKey, demoKey)) {
    return new Response('Not found', { status: 404 })
  }

  const isProd = process.env.NODE_ENV === 'production'
  const cookieName = isProd
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'

  const token = await encode({
    token: {
      sub: DEMO2_USER_ID,
      id: DEMO2_USER_ID,
      name: DEMO2_USER_NAME,
      email: DEMO2_USER_EMAIL,
      picture: null,
    },
    secret: process.env.AUTH_SECRET!,
    salt: cookieName,
    maxAge: 7 * 24 * 60 * 60,
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
