'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', label: 'Overview' },
  { href: '/pacts', icon: 'description', label: 'My Pacts' },
  { href: '/network', icon: 'hub', label: 'Network' },
  { href: '/audit', icon: 'history_edu', label: 'Audit Trail' },
  { href: '/settings', icon: 'settings', label: 'Settings' },
] as const

interface SidebarProps {
  userName?: string | null
}

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/pacts') return pathname.startsWith('/pacts') && !pathname.startsWith('/pacts/new')
    return pathname === href
  }

  return (
    <aside
      className="h-screen w-64 fixed left-0 top-0 flex flex-col z-50"
      style={{
        background: '#201f1f',
        borderRight: '1px solid rgba(68,73,51,0.3)',
      }}
    >
      {/* Brand */}
      <div className="px-4 pt-8 pb-4">
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          Pact Protocol
        </h1>
        <p className="font-label-sm text-label-sm text-on-surface-variant opacity-60 tracking-widest mt-1">
          VERIFIED LEGAL NODE
        </p>
      </div>

      {/* Profile */}
      <div className="flex items-center gap-3 px-4 mb-6">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
          style={{ background: '#c3f400', color: '#0A0A0A' }}
        >
          {(userName?.[0] ?? 'U').toUpperCase()}
        </div>
        <div>
          <p className="font-label-sm text-label-sm text-on-surface font-bold leading-none">
            {userName ?? 'User'}
          </p>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter mt-0.5">
            Status: Synchronized
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded transition-all"
              style={{
                background: active ? 'rgba(53,53,52,0.5)' : 'transparent',
                borderLeft: active ? '2px solid #c3f400' : '2px solid transparent',
                color: active ? '#c3f400' : '#c4c9ac',
                fontWeight: active ? 700 : 400,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 20,
                  fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <span className="font-label-sm text-label-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* CTA */}
      <div className="px-4 mb-4 mt-auto">
        <Link
          href="/pacts/new"
          className="w-full bg-primary-fixed text-on-primary-fixed font-bold py-3 rounded-full flex items-center justify-center gap-2 glow-hover transition-all active:scale-95"
          style={{ textDecoration: 'none' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
          <span className="font-label-sm text-label-sm">New Pact</span>
        </Link>
      </div>

      {/* Footer */}
      <div
        className="px-2 pb-4"
        style={{ borderTop: '1px solid rgba(68,73,51,0.3)', paddingTop: 16 }}
      >
        <a
          href="mailto:support@usepact.app"
          className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-highest rounded transition-all"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>help</span>
          <span className="font-label-sm text-label-sm">Support</span>
        </a>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-error rounded transition-all"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
          <span className="font-label-sm text-label-sm">Log Out</span>
        </button>
      </div>
    </aside>
  )
}
