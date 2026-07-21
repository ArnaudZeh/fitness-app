import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { ProgramsListPage } from '@/pages/ProgramsListPage'
import { ProgramNewPage } from '@/pages/ProgramNewPage'
import { ProgramDetailPage } from '@/pages/ProgramDetailPage'
import { BlockDetailPage } from '@/pages/BlockDetailPage'

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
          <Route
            path="/programs/:programId/blocks/:blockId"
            element={<BlockDetailPage />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
