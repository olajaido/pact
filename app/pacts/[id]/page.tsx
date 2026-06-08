import { auth } from '@/auth'
import { getPactById } from '@/lib/db/queries/pacts'
import { notFound, redirect } from 'next/navigation'
import { PactDetailClient } from '@/components/pact/PactDetailClient'

export default async function PactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')

  const { id } = await params
  const data = await getPactById(id, session.user.id)

  if (!data) notFound()

  if (!data.currentParty) {
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
        <p>You are not a party to this Pact.</p>
      </main>
    )
  }

  return (
    <PactDetailClient
      pactId={id}
      initialData={data}
      currentUserId={session.user.id}
    />
  )
}
