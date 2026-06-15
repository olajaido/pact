import Link from 'next/link'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listPactsWithSummary } from '@/lib/db/queries/pacts'
import { PactCard } from '@/components/pact/PactCard'
import { SidebarLayout } from '@/components/navigation/SidebarLayout'

const STATUS_TABS = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending', value: 'PENDING_ACCEPTANCE' },
  { label: 'Executed', value: 'EXECUTED' },
  { label: 'Voided', value: 'VOID' },
] as const

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')

  const { status } = await searchParams
  // Pass email so pending invites (userId = null) also appear in the dashboard
  const summaries = await listPactsWithSummary(session.user.id, status, session.user.email ?? undefined)

  return (
    <SidebarLayout>
      {/* Top bar */}
      <header
        className="flex justify-between items-center px-margin-desktop py-stack-md sticky top-0 z-40"
        style={{
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(68,73,51,0.2)',
        }}
      >
        <h2
          className="text-on-surface font-bold"
          style={{ fontFamily: "'Playfair Display', serif", fontSize: 28 }}
        >
          Your Pacts
        </h2>
        <Link
          href="/pacts/new"
          className="bg-primary-fixed text-on-primary-fixed font-bold px-6 py-2.5 rounded-full font-label-sm text-label-sm glow-hover active:scale-95 transition-all"
          style={{ textDecoration: 'none' }}
        >
          + New Pact
        </Link>
      </header>

      {/* Content */}
      <section className="px-margin-desktop py-stack-lg">
        {/* Filter tabs */}
        <div
          className="flex items-center gap-2 mb-stack-lg pb-4"
          style={{ borderBottom: '1px solid rgba(68,73,51,0.2)' }}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = (tab.value ?? '') === (status ?? '')
            return (
              <Link
                key={tab.label}
                href={tab.value ? `/dashboard?status=${tab.value}` : '/dashboard'}
                className="px-6 py-2 rounded-full font-label-sm text-label-sm transition-all active:scale-95"
                style={{
                  background: isActive ? '#c3f400' : 'transparent',
                  color: isActive ? '#161e00' : '#c4c9ac',
                  fontWeight: isActive ? 700 : 400,
                  textDecoration: 'none',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        {/* Empty state */}
        {summaries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{ minHeight: 500 }}
          >
            <div className="relative w-40 h-40 mb-stack-lg">
              <div
                className="absolute inset-0 rounded-full blur-3xl opacity-20 animate-pulse"
                style={{ background: 'radial-gradient(circle, #c3f400, transparent)' }}
              />
              <div className="relative flex items-center justify-center h-full">
                <span
                  className="material-symbols-outlined text-surface-container-highest select-none"
                  style={{ fontSize: 96, fontVariationSettings: "'wght' 100" }}
                >
                  description
                </span>
              </div>
            </div>
            <h3
              className="text-on-surface mb-2"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 500 }}
            >
              {status ? 'No pacts with this status.' : 'You have no pacts yet.'}
            </h3>
            <p
              className="font-body-md text-on-surface-variant mb-stack-lg opacity-80"
              style={{ maxWidth: 400 }}
            >
              Create your first cryptographically secured commitment and start building your trust network.
            </p>
            <Link
              href="/pacts/new"
              className="bg-primary-fixed text-on-primary-fixed font-bold px-10 py-4 rounded-full font-label-sm text-label-sm glow-hover transition-all active:scale-95"
              style={{ textDecoration: 'none' }}
            >
              Create your first Pact
            </Link>

            {/* Feature teaser */}
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-stack-md mt-16 w-full text-left"
              style={{ maxWidth: 768 }}
            >
              {[
                { icon: 'security', label: 'SECURE EXECUTION', body: 'Multi-sig validation for all contractual obligations.' },
                { icon: 'bolt', label: 'AUTO-SETTLEMENT', body: 'Funds are released instantly upon proof of delivery.' },
                { icon: 'gavel', label: 'IMMUTABLE AUDIT', body: 'Tamper-evident hash chain on every state change.' },
              ].map((f) => (
                <div
                  key={f.label}
                  className="p-stack-md rounded-xl border border-transparent hover:border-outline-variant transition-all"
                  style={{ background: '#201f1f' }}
                >
                  <span
                    className="material-symbols-outlined text-primary-fixed mb-2 block"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                  <h4 className="font-label-sm text-label-sm text-on-surface mb-1">{f.label}</h4>
                  <p style={{ fontSize: 13, color: '#c4c9ac', lineHeight: 1.5 }}>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
            {summaries.map((s) => (
              <PactCard key={s.pact.id} summary={s} userEmail={session.user.email ?? undefined} />
            ))}
          </div>
        )}
      </section>
    </SidebarLayout>
  )
}
