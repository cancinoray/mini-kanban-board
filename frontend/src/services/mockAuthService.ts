import { AuthError, type AuthService, type AuthUser, type RegisterInput, type SignInInput } from './AuthService'

const USERS_KEY = 'mini-kanban:users'
const SESSION_KEY = 'mini-kanban:session'

interface StoredUser extends AuthUser {
  password: string
}

/**
 * Stands in for a real auth backend: accounts and the current session live in
 * localStorage, so sign-in works with no server. Passwords are stored in plain
 * text because this is a throwaway mock — a real AuthService must hash them
 * server-side, keep them out of the client, and expose this same interface.
 */
export class MockAuthService implements AuthService {
  private usersKey: string
  private sessionKey: string
  /** artificial latency so UI submitting states are exercised even locally */
  private latencyMs: number

  constructor(options: { usersKey?: string; sessionKey?: string; latencyMs?: number } = {}) {
    this.usersKey = options.usersKey ?? USERS_KEY
    this.sessionKey = options.sessionKey ?? SESSION_KEY
    this.latencyMs = options.latencyMs ?? 0
  }

  private async delay<T>(value: T): Promise<T> {
    if (this.latencyMs <= 0) return value
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs))
    return value
  }

  private readUsers(): StoredUser[] {
    const raw = localStorage.getItem(this.usersKey)
    if (!raw) return []
    try {
      return JSON.parse(raw) as StoredUser[]
    } catch {
      return []
    }
  }

  private writeUsers(users: StoredUser[]): void {
    localStorage.setItem(this.usersKey, JSON.stringify(users))
  }

  private readSessionUserId(): string | null {
    return localStorage.getItem(this.sessionKey)
  }

  private setSession(userId: string | null): void {
    if (userId) localStorage.setItem(this.sessionKey, userId)
    else localStorage.removeItem(this.sessionKey)
  }

  private toAuthUser(user: StoredUser): AuthUser {
    return { id: user.id, name: user.name, email: user.email }
  }

  /** Emails are case-insensitive so "Ray@Example.com" and "ray@example.com" are one account. */
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const userId = this.readSessionUserId()
    if (!userId) return this.delay(null)
    const user = this.readUsers().find((u) => u.id === userId)
    if (!user) {
      this.setSession(null)
      return this.delay(null)
    }
    return this.delay(this.toAuthUser(user))
  }

  async register(input: RegisterInput): Promise<AuthUser> {
    const users = this.readUsers()
    const email = this.normalizeEmail(input.email)
    if (users.some((u) => this.normalizeEmail(u.email) === email)) {
      throw new AuthError('email-taken', `An account already exists for ${email}`)
    }
    const user: StoredUser = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      email,
      password: input.password,
    }
    users.push(user)
    this.writeUsers(users)
    this.setSession(user.id)
    return this.delay(this.toAuthUser(user))
  }

  async signIn(input: SignInInput): Promise<AuthUser> {
    const email = this.normalizeEmail(input.email)
    const user = this.readUsers().find(
      (u) => this.normalizeEmail(u.email) === email && u.password === input.password,
    )
    if (!user) throw new AuthError('invalid-credentials', 'Email or password is incorrect')
    this.setSession(user.id)
    return this.delay(this.toAuthUser(user))
  }

  async signOut(): Promise<void> {
    this.setSession(null)
    return this.delay(undefined)
  }
}
