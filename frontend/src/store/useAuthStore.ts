import { create } from 'zustand'
import {
  authService,
  type AuthService,
  type AuthUser,
  type RegisterInput,
  type SignInInput,
} from '../services'

type AuthStatus = 'loading' | 'ready'

interface AuthState {
  service: AuthService
  user: AuthUser | null
  status: AuthStatus
  /** Set when the backend dropped the session, so the sign-in page can say why. */
  sessionExpired: boolean

  init: () => Promise<void>
  signIn: (input: SignInInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  signOut: () => Promise<void>
  expireSession: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  service: authService,
  user: null,
  status: 'loading',
  sessionExpired: false,

  init: async () => {
    const user = await get().service.getCurrentUser()
    set({ user, status: 'ready' })
  },

  signIn: async (input) => {
    const user = await get().service.signIn(input)
    set({ user, sessionExpired: false })
  },

  register: async (input) => {
    const user = await get().service.register(input)
    set({ user, sessionExpired: false })
  },

  signOut: async () => {
    await get().service.signOut()
    set({ user: null, sessionExpired: false })
  },

  /**
   * The backend no longer recognises our session. Clear the user without
   * asking it to log out — it already has — and note why, so the sign-in page
   * can explain the return trip.
   */
  expireSession: () => {
    if (!get().user) return
    set({ user: null, sessionExpired: true })
  },
}))
