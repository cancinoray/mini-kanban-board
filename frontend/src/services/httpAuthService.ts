import { AuthError, type AuthService, type AuthUser, type RegisterInput, type SignInInput } from './AuthService'
import { ApiError, apiRequest, DEFAULT_API_BASE_URL } from './httpClient'

/**
 * Signs in against the real backend. The session lives in an httpOnly cookie
 * the browser holds and sends back, so the service never sees or stores a
 * credential of its own — `getCurrentUser` is just "does the cookie work?".
 */
export class HttpAuthService implements AuthService {
  private baseUrl: string

  constructor(options: { baseUrl?: string } = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_API_BASE_URL
  }

  /** No session, or one the backend no longer recognises, is simply "signed out". */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      return await apiRequest<AuthUser>('/auth/me', { baseUrl: this.baseUrl })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  }

  async signIn(input: SignInInput): Promise<AuthUser> {
    try {
      return await apiRequest<AuthUser>('/auth/login', {
        baseUrl: this.baseUrl,
        method: 'POST',
        body: input,
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new AuthError('invalid-credentials', error.message)
      }
      throw error
    }
  }

  async register(input: RegisterInput): Promise<AuthUser> {
    try {
      return await apiRequest<AuthUser>('/auth/register', {
        baseUrl: this.baseUrl,
        method: 'POST',
        body: input,
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        throw new AuthError('email-taken', error.message)
      }
      throw error
    }
  }

  async signOut(): Promise<void> {
    try {
      await apiRequest<void>('/auth/logout', { baseUrl: this.baseUrl, method: 'POST' })
    } catch (error) {
      // An already-dead session has nothing left to log out, and being signed
      // out is what the caller asked for anyway. Anything else is a real failure.
      if (!(error instanceof ApiError) || error.status !== 401) throw error
    }
  }
}
