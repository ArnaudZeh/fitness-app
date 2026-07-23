import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'

// Only the pages reachable on first paint (unauthenticated login/signup, and
// the authenticated landing page) are eager — every other route is
// secondary navigation, lazy-loaded so it doesn't inflate the bundle every
// visitor downloads before they've even signed in. AppLayout wraps all of
// these in a single Suspense boundary around its <Outlet />.
const ProgramsListPage = lazy(() =>
  import('@/pages/ProgramsListPage').then((m) => ({ default: m.ProgramsListPage })),
)
const ProgramNewPage = lazy(() =>
  import('@/pages/ProgramNewPage').then((m) => ({ default: m.ProgramNewPage })),
)
const ProgramDetailPage = lazy(() =>
  import('@/pages/ProgramDetailPage').then((m) => ({ default: m.ProgramDetailPage })),
)
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const SessionLogPage = lazy(() =>
  import('@/pages/SessionLogPage').then((m) => ({ default: m.SessionLogPage })),
)
const WellnessPage = lazy(() =>
  import('@/pages/WellnessPage').then((m) => ({ default: m.WellnessPage })),
)
const BreathPage = lazy(() =>
  import('@/pages/BreathPage').then((m) => ({ default: m.BreathPage })),
)
const CyclePage = lazy(() =>
  import('@/pages/CyclePage').then((m) => ({ default: m.CyclePage })),
)
const AnalyticsPage = lazy(() =>
  import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
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
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
