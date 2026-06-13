import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { PageTransition } from './PageTransition'
import { DemoBanner } from './DemoBanner'
import { CrisisButton } from '@/components/CrisisButton'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-text-primary">
      <Navbar />
      <DemoBanner />
      <main className="flex-1">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
      <CrisisButton />
    </div>
  )
}
