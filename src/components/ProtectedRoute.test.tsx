import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuthStore } from '@/lib/auth-store'

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>secret content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('shows a loading state while auth status is unresolved', () => {
    useAuthStore.setState({ status: 'loading', session: null })
    renderProtected()
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated', () => {
    useAuthStore.setState({ status: 'unauthenticated', session: null })
    renderProtected()
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('secret content')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    // @ts-expect-error partial session is enough for this render test
    useAuthStore.setState({ status: 'authenticated', session: { user: {} } })
    renderProtected()
    expect(screen.getByText('secret content')).toBeInTheDocument()
  })
})
