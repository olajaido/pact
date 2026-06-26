import { NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'

// Pre-configured demo account — info@j3consult.co.uk
// This user exists in Aurora DSQL and has real pacts demonstrating the full flow.
// Judges visit /demo → get a valid session → land on the dashboard automatically.
const DEMO_USER_ID = '9aa15630-862e-4d9c-b194-d974b0eae042'
const DEMO_USER_EMAIL = 'info@j3consult.co.uk'
const DEMO_USER_NAME = 'Pact Demo'

export async function GET(req: Request) {
  const isProd = process.env.NODE_ENV === 'production'

  // Auth.js v5 uses the cookie name as the JWT salt — must match exactly
  const cookieName = isProd
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'

  // Create a valid Auth.js JWT session token for the demo user
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
    maxAge: 30 * 24 * 60 * 60, // 30 days — stays valid for the judging period
  })

  // Redirect to dashboard using the request origin (works on any deployment URL)
  const origin = new URL(req.url).origin
  const response = NextResponse.redirect(new URL('/dashboard', origin))

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })

  return response
}
