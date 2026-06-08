import type { Metadata } from 'next'
import { Playfair_Display, Hanken_Grotesk } from 'next/font/google'
import './globals.css'

const playfairDisplay = Playfair_Display({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const hankenGrotesk = Hanken_Grotesk({
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${playfairDisplay.variable} ${hankenGrotesk.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
