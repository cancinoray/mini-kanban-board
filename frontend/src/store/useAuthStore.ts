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

  init: () => Promise<void>
  signIn: (input: SignInInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  service: authService,
  user: null,
  status: 'loading',

  init: async () => {
    const user = await get().service.getCurrentUser()
    set({ user, status: 'ready' })
  },

  signIn: async (input) => {
    const user = await get().service.signIn(input)
    set({ user })
  },

  register: async (input) => {
    const user = await get().service.register(input)
    set({ user })
  },

  signOut: async () => {
    await get().service.signOut()
    set({ user: null })
  },
}))
