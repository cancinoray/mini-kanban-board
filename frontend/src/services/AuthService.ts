export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface SignInInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export type AuthErrorCode = 'invalid-credentials' | 'email-taken'

/** Rejected auth calls carry a code so the UI owns the wording, not the service. */
export class AuthError extends Error {
  code: AuthErrorCode

  constructor(code: AuthErrorCode, message: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

/**
 * Everything the frontend needs to know about who is signed in, in one place.
 * Swap the implementation (e.g. for a real HTTP client) without touching callers.
 */
export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>
  signIn(input: SignInInput): Promise<AuthUser>
  register(input: RegisterInput): Promise<AuthUser>
  signOut(): Promise<void>
}
