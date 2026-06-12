import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { CommunityPage } from '@/pages/CommunityPage'
import { EventsPage } from '@/pages/EventsPage'
import { CheckInPage } from '@/pages/CheckInPage'
import { AIAssistantPage } from '@/pages/AIAssistantPage'
import { CirclesPage } from '@/pages/CirclesPage'
import { DashboardPage } from '@/pages/DashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/circles" element={<CirclesPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/check-in" element={<CheckInPage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
