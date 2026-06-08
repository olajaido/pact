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
        className="flex items-center justify-center min-h-screen"
        style={{ background: '#0A0A0A' }}
      >
        <p className="text-on-surface-variant">You are not a party to this Pact.</p>
      </main>
    )
  }

  return (
    <PactDetailClient pactId={id} initialData={data} currentUserId={session.user.id} />
  )
}
