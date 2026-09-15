import { beforeEach, describe, expect, it } from 'vitest'
import { AuthError } from './AuthService'
import { MockAuthService } from './mockAuthService'

describe('MockAuthService', () => {
  let service: MockAuthService

  beforeEach(() => {
    localStorage.clear()
    service = new MockAuthService({ usersKey: 'test:auth:users', sessionKey: 'test:auth:session' })
  })

  it('starts signed out', async () => {
    expect(await service.getCurrentUser()).toBeNull()
  })

  it('registers an account and keeps the user signed in', async () => {
    const user = await service.register({ name: 'Ray', email: 'ray@example.com', password: 'password123' })

    expect(user.name).toBe('Ray')
    expect(user.email).toBe('ray@example.com')
    expect(await service.getCurrentUser()).toEqual(user)
  })

  it('never hands the stored password back', async () => {
    const user = await service.register({ name: 'Ray', email: 'ray@example.com', password: 'password123' })
    expect(Object.keys(user).sort()).toEqual(['email', 'id', 'name'])
  })

  it('signs in with an existing account', async () => {
    await service.register({ name: 'Ray', email: 'ray@example.com', password: 'password123' })
    await service.signOut()

    const user = await service.signIn({ email: 'ray@example.com', password: 'password123' })

    expect(user.email).toBe('ray@example.com')
    expect(await service.getCurrentUser()).toEqual(user)
  })

  it('treats emails as case-insensitive', async () => {
    await service.register({ name: 'Ray', email: 'Ray@Example.com', password: 'password123' })

    expect((await service.getCurrentUser())?.email).toBe('ray@example.com')
    await expect(service.signIn({ email: 'RAY@example.com', password: 'password123' })).resolves.toMatchObject({
      email: 'ray@example.com',
    })
  })

  it('rejects a wrong password', async () => {
    await service.register({ name: 'Ray', email: 'ray@example.com', password: 'password123' })

    await expect(service.signIn({ email: 'ray@example.com', password: 'nope' })).rejects.toThrow(AuthError)
    await expect(service.signIn({ email: 'ray@example.com', password: 'nope' })).rejects.toMatchObject({
      code: 'invalid-credentials',
    })
  })

  it('rejects an unknown email', async () => {
    await expect(service.signIn({ email: 'nobody@example.com', password: 'password123' })).rejects.toMatchObject({
      code: 'invalid-credentials',
    })
  })

  it('rejects a second account for the same email', async () => {
    await service.register({ name: 'Ray', email: 'ray@example.com', password: 'password123' })

    await expect(
      service.register({ name: 'Someone else', email: 'RAY@example.com', password: 'password123' }),
    ).rejects.toMatchObject({ code: 'email-taken' })
  })

  it('signs out by forgetting the session, keeping the account', async () => {
    await service.register({ name: 'Ray', email: 'ray@example.com', password: 'password123' })

    await service.signOut()

    expect(await service.getCurrentUser()).toBeNull()
    await expect(service.signIn({ email: 'ray@example.com', password: 'password123' })).resolves.toMatchObject({
      name: 'Ray',
    })
  })
})
