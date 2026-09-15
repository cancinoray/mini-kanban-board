import { HttpAuthService } from './httpAuthService'
import { HttpKanbanService } from './httpKanbanService'
import type { AuthService } from './AuthService'
import type { KanbanService } from './KanbanService'

export type { AuthErrorCode, AuthService, AuthUser, RegisterInput, SignInInput } from './AuthService'
export { AuthError } from './AuthService'
export type { KanbanService } from './KanbanService'
export { ApiError, DEFAULT_API_BASE_URL } from './httpClient'
export { HttpAuthService, HttpKanbanService }
export { LocalStorageKanbanService } from './localStorageKanbanService'
export { MockAuthService } from './mockAuthService'
export { notifySessionExpired, onSessionExpired } from './sessionExpiry'

/** Single service instance every component/store goes through — the real backend, over HTTP. */
export const kanbanService: KanbanService = new HttpKanbanService()

/** Single auth service instance — the real backend behind every sign-in, registration, session, and sign-out call. */
export const authService: AuthService = new HttpAuthService()
