import { LocalStorageKanbanService } from './localStorageKanbanService'
import { MockAuthService } from './mockAuthService'
import type { AuthService } from './AuthService'
import type { KanbanService } from './KanbanService'

export type { AuthErrorCode, AuthService, AuthUser, RegisterInput, SignInInput } from './AuthService'
export { AuthError } from './AuthService'
export type { KanbanService } from './KanbanService'
export { LocalStorageKanbanService } from './localStorageKanbanService'
export { MockAuthService } from './mockAuthService'

/** Single service instance every component/store goes through — never call localStorage directly outside the services folder. */
export const kanbanService: KanbanService = new LocalStorageKanbanService()

/** Single auth service instance — the backend mock behind every sign-in, registration, session, and sign-out call. */
export const authService: AuthService = new MockAuthService()
