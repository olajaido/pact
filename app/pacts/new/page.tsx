import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CreatePactForm } from '@/components/forms/CreatePactForm'

export default async function NewPactPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#0A0A0A' }}>
      {/* Top nav */}
      <header
        className="sticky top-0 z-50 flex justify-between items-center px-margin-desktop py-stack-md"
        style={{ background: '#131313', borderBottom: '1px solid rgba(68,73,51,0.3)' }}
      >
        <div
          className="font-bold text-on-surface"
          style={{ fontFamily: "'Playfair Display', serif", fontSize: 20 }}
        >
          Pact
        </div>
        <nav className="hidden md:flex items-center gap-gutter">
          <Link
            href="/dashboard"
            className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-fixed transition-colors"
          >
            Dashboard
          </Link>
          <span
            className="font-label-sm text-label-sm text-primary-fixed"
            style={{ borderBottom: '2px solid #c3f400', paddingBottom: 4 }}
          >
            Create
          </span>
        </nav>
        <Link
          href="/dashboard"
          className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-fixed transition-colors"
        >
          ← Dashboard
        </Link>
      </header>

      <main
        className="flex-grow flex flex-col items-center justify-start w-full mx-auto px-margin-mobile md:px-margin-desktop"
        style={{ maxWidth: 1280, paddingTop: 48, paddingBottom: 48 }}
      >
        <CreatePactForm
          creatorEmail={session.user.email!}
          creatorName={session.user.name ?? session.user.email ?? ''}
        />
      </main>
    </div>
  )
}
