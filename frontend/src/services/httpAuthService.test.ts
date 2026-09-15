import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError } from './AuthService'
import { ApiError } from './httpClient'
import { HttpAuthService } from './httpAuthService'

const BASE_URL = 'http://api.test'
const user = { id: 'u1', name: 'Ray', email: 'ray@example.com' }

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const noContentResponse = () => new Response(null, { status: 204 })

describe('HttpAuthService', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let service: HttpAuthService

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    service = new HttpAuthService({ baseUrl: BASE_URL })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the signed-in user from GET /auth/me', async () => {
    fetchMock.mockResolvedValue(jsonResponse(user))

    await expect(service.getCurrentUser()).resolves.toEqual(user)
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/auth/me`,
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('treats a 401 from /auth/me as signed out, not as an error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'No active session' }, 401))

    await expect(service.getCurrentUser()).resolves.toBeNull()
  })

  it('signs in by POSTing the credentials', async () => {
    fetchMock.mockResolvedValue(jsonResponse(user))

    const credentials = { email: 'ray@example.com', password: 'password123' }
    await expect(service.signIn(credentials)).resolves.toEqual(user)
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/auth/login`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(credentials),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  it('reports a rejected sign-in as invalid credentials', async () => {
    // A Response body can only be read once, so hand every call a fresh one.
    fetchMock.mockImplementation(async () =>
      jsonResponse({ message: 'Email or password is incorrect' }, 401),
    )

    await expect(service.signIn({ email: 'ray@example.com', password: 'nope' })).rejects.toBeInstanceOf(
      AuthError,
    )
    await expect(service.signIn({ email: 'ray@example.com', password: 'nope' })).rejects.toMatchObject(
      { code: 'invalid-credentials' },
    )
  })

  it('registers an account and returns the new user', async () => {
    fetchMock.mockResolvedValue(jsonResponse(user, 201))

    const input = { name: 'Ray', email: 'ray@example.com', password: 'password123' }
    await expect(service.register(input)).resolves.toEqual(user)
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/auth/register`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
    )
  })

  it('reports a duplicate email as email-taken', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'An account already exists for this email' }, 409))

    await expect(
      service.register({ name: 'Ray', email: 'ray@example.com', password: 'password123' }),
    ).rejects.toMatchObject({ code: 'email-taken' })
  })

  it('leaves an undecodable rejection as an ApiError, so the UI can fall back', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'password: String should have at least 8 characters' }, 422),
    )

    const rejection = service.register({ name: 'Ray', email: 'ray@example.com', password: 'short' })
    await expect(rejection).rejects.toBeInstanceOf(ApiError)
    await expect(rejection).rejects.not.toBeInstanceOf(AuthError)
  })

  it('signs out by POSTing to /auth/logout', async () => {
    fetchMock.mockResolvedValue(noContentResponse())

    await expect(service.signOut()).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/auth/logout`,
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('treats a 401 from /auth/logout as already signed out', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'No active session' }, 401))

    await expect(service.signOut()).resolves.toBeUndefined()
  })

  it('still reports a real failure to sign out', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Internal Server Error' }, 500))

    await expect(service.signOut()).rejects.toBeInstanceOf(ApiError)
  })
})
