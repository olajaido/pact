import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { CreatePactForm } from '@/components/forms/CreatePactForm'

export default async function NewPactPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')

  return (
    <div style={{ background: '#0C0C0E', minHeight: '100vh' }}>
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 32px',
          height: 56,
          borderBottom: '1px solid #242428',
        }}
      >
        <a
          href="/dashboard"
          style={{
            fontFamily: 'var(--font-heading), DM Serif Display, serif',
            fontSize: 20,
            color: '#F0EFE8',
            textDecoration: 'none',
          }}
        >
          Pact
        </a>
        <a
          href="/dashboard"
          style={{ color: '#6B7280', fontSize: 13, textDecoration: 'none' }}
        >
          ← Dashboard
        </a>
      </nav>
      <CreatePactForm
        creatorEmail={session.user.email!}
        creatorName={session.user.name ?? session.user.email ?? ''}
      />
    </div>
  )
}
