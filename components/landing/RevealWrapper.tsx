'use client'

import { useRevealOnScroll } from '@/hooks/useRevealOnScroll'

export function RevealWrapper({ children }: { children: React.ReactNode }) {
  useRevealOnScroll()
  return <>{children}</>
}
