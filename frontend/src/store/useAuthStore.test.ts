import { beforeEach, describe, expect, it } from 'vitest'
import { MockAuthService } from '../services/mockAuthService'
import { useAuthStore } from './useAuthStore'

const CREDENTIALS = { email: 'ray@example.com', password: 'password123' }

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({
      service: new MockAuthService({
        usersKey: 'test:auth-store:users',
        sessionKey: 'test:auth-store:session',
      }),
      user: null,
      status: 'ready',
      sessionExpired: false,
    })
  })

  const registerAccount = () =>
    useAuthStore.getState().register({ name: 'Ray', ...CREDENTIALS })

  it('expireSession signs the user out and says why', async () => {
    await registerAccount()
    expect(useAuthStore.getState().user).not.toBeNull()

    useAuthStore.getState().expireSession()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().sessionExpired).toBe(true)
  })

  it('expireSession does nothing when nobody is signed in', () => {
    useAuthStore.getState().expireSession()

    expect(useAuthStore.getState().sessionExpired).toBe(false)
  })

  it('signing back in clears the expired-session notice', async () => {
    await registerAccount()
    useAuthStore.getState().expireSession()

    await useAuthStore.getState().signIn(CREDENTIALS)

    expect(useAuthStore.getState().user?.email).toBe(CREDENTIALS.email)
    expect(useAuthStore.getState().sessionExpired).toBe(false)
  })
})
