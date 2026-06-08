import type { Metadata } from 'next'
import { DM_Serif_Display, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'

const dmSerifDisplay = DM_Serif_Display({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})

const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Pact — Commitments that execute themselves',
  description:
    'Multi-party commitment execution platform. Define obligations, all parties fulfil them, the outcome fires atomically. Backed by Aurora DSQL distributed ACID transactions.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${dmSerifDisplay.variable} ${ibmPlexSans.variable}`}
    >
      <body style={{ background: '#0C0C0E', margin: 0, minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
