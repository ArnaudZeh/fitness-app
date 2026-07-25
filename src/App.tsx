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
const ProgramGeneratePage = lazy(() =>
  import('@/pages/ProgramGeneratePage').then((m) => ({ default: m.ProgramGeneratePage })),
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
const CyclePage = lazy(() =>
  import('@/pages/CyclePage').then((m) => ({ default: m.CyclePage })),
)
const AnalyticsPage = lazy(() =>
  import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
)
const FeedPage = lazy(() =>
  import('@/pages/FeedPage').then((m) => ({ default: m.FeedPage })),
)
const FriendsPage = lazy(() =>
  import('@/pages/FriendsPage').then((m) => ({ default: m.FriendsPage })),
)
const CoachPage = lazy(() =>
  import('@/pages/CoachPage').then((m) => ({ default: m.CoachPage })),
)

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
          <Route path="/programs/generate" element={<ProgramGeneratePage />} />
          <Route path="/programs/:id" element={<ProgramDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/sessions/:id" element={<SessionLogPage />} />
          <Route path="/bien-etre" element={<WellnessPage />} />
          <Route path="/cycle" element={<CyclePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/coach" element={<CoachPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
