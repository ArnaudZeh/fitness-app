import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from '@/pages/LoginPage'
import { useAuthStore } from '@/lib/auth-store'

const signInWithPassword = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) =>
        (signInWithPassword as (...a: unknown[]) => unknown)(...args),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => undefined } },
      }),
    },
  },
}))

describe('LoginPage', () => {
  beforeEach(() => {
    signInWithPassword.mockReset()
    useAuthStore.setState({ status: 'unauthenticated', session: null })
  })

  it('submits the entered credentials', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'arnaud@example.com')
    await user.type(screen.getByLabelText('Mot de passe'), 'correct-password')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'arnaud@example.com',
        password: 'correct-password',
      })
    })
  })

  it('shows a readable error message on invalid credentials', async () => {
    signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'arnaud@example.com')
    await user.type(screen.getByLabelText('Mot de passe'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email ou mot de passe incorrect.',
    )
  })
})
