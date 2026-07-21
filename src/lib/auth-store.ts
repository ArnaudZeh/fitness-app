import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  session: Session | null
  status: AuthStatus
}

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  status: 'loading',
}))

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({
    session,
    status: session ? 'authenticated' : 'unauthenticated',
  })
})
