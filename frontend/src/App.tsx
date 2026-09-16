import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { CommunityPage } from '@/pages/CommunityPage'
import { EventsPage } from '@/pages/EventsPage'
import { CheckInPage } from '@/pages/CheckInPage'
import { AIAssistantPage } from '@/pages/AIAssistantPage'
import { CirclesPage } from '@/pages/CirclesPage'
import { ComfortPage } from '@/pages/ComfortPage'
import { CounselorsPage } from '@/pages/CounselorsPage'
import { FindHelpPage } from '@/pages/FindHelpPage'
import { HostWithUsPage } from '@/pages/HostWithUsPage'
import { JournalPage } from '@/pages/JournalPage'
import { ReflectionPage } from '@/pages/ReflectionPage'
import { ScreeningConsentPage } from '@/pages/ScreeningConsentPage'
import { ScreeningStage1Page } from '@/pages/ScreeningStage1Page'
import { ScreeningStage2Page } from '@/pages/ScreeningStage2Page'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/circles" element={<CirclesPage />} />
          <Route path="/comfort" element={<ComfortPage />} />
          <Route path="/counselors" element={<CounselorsPage />} />
          <Route path="/host-with-us" element={<HostWithUsPage />} />
          <Route path="/find-help" element={<FindHelpPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/check-in" element={<CheckInPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/reflection" element={<ReflectionPage />} />
          <Route path="/screening/consent" element={<ScreeningConsentPage />} />
          <Route path="/screening/stage1" element={<ScreeningStage1Page />} />
          <Route path="/screening/stage2" element={<ScreeningStage2Page />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
