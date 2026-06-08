import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listPactsWithSummary } from '@/lib/db/queries/pacts'
import { PactCard } from '@/components/pact/PactCard'

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
  const summaries = await listPactsWithSummary(session.user.id, status)

  return (
    <main
      style={{
        padding: 32,
        fontFamily: 'IBM Plex Sans, sans-serif',
        color: '#F0EFE8',
        background: '#0C0C0E',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}
      >
        <h1
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 32,
            margin: 0,
          }}
        >
          Your Pacts
        </h1>
        <a
          href="/pacts/new"
          style={{
            background: '#D4FF4F',
            color: '#0C0C0E',
            padding: '10px 20px',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          + New Pact
        </a>
      </div>

      {/* Status filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 28,
          borderBottom: '1px solid #242428',
          paddingBottom: 12,
        }}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = (tab.value ?? '') === (status ?? '')
          return (
            <a
              key={tab.label}
              href={tab.value ? `/dashboard?status=${tab.value}` : '/dashboard'}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: isActive ? 700 : 400,
                background: isActive ? '#D4FF4F' : 'transparent',
                color: isActive ? '#0C0C0E' : '#6B7280',
                textDecoration: 'none',
              }}
            >
              {tab.label}
            </a>
          )
        })}
      </div>

      {/* Pact grid or empty state */}
      {summaries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ color: '#6B7280', fontSize: 16, marginBottom: 24 }}>
            {status ? 'No pacts with this status.' : 'You have no pacts yet.'}
          </p>
          <a
            href="/pacts/new"
            style={{
              background: '#D4FF4F',
              color: '#0C0C0E',
              padding: '12px 24px',
              borderRadius: 6,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Create your first Pact
          </a>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {summaries.map((summary) => (
            <PactCard key={summary.pact.id} summary={summary} />
          ))}
        </div>
      )}
    </main>
  )
}
