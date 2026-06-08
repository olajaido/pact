import { auth } from '@/auth'
import { Sidebar } from './Sidebar'

interface SidebarLayoutProps {
  children: React.ReactNode
}

export async function SidebarLayout({ children }: SidebarLayoutProps) {
  const session = await auth()
  const userName = session?.user?.name ?? session?.user?.email ?? null

  return (
    <div className="flex h-screen w-full" style={{ background: '#0A0A0A' }}>
      <Sidebar userName={userName} />
      <main
        className="flex-1 overflow-y-auto min-h-screen"
        style={{ marginLeft: 256, background: '#0A0A0A' }}
      >
        {children}
      </main>
    </div>
  )
}
