import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { ProgramsListPage } from '@/pages/ProgramsListPage'
import { ProgramNewPage } from '@/pages/ProgramNewPage'
import { ProgramDetailPage } from '@/pages/ProgramDetailPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SessionLogPage } from '@/pages/SessionLogPage'
import { WellnessPage } from '@/pages/WellnessPage'
import { BreathPage } from '@/pages/BreathPage'
import { CyclePage } from '@/pages/CyclePage'

// Recharts pulls in a sizeable chunk (~110kB gzip) only needed on this one
// route — lazy-loaded so every other page's initial bundle stays lean.
const AnalyticsPage = lazy(() =>
  import('@/pages/AnalyticsPage').then((module) => ({
    default: module.AnalyticsPage,
  })),
)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/programs" element={<ProgramsListPage />} />
          <Route path="/programs/new" element={<ProgramNewPage />} />
          <Route path="/programs/:id" element={<ProgramDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/sessions/:id" element={<SessionLogPage />} />
          <Route path="/bien-etre" element={<WellnessPage />} />
          <Route path="/apnee" element={<BreathPage />} />
          <Route path="/cycle" element={<CyclePage />} />
          <Route
            path="/analytics"
            element={
              <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
                <AnalyticsPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
