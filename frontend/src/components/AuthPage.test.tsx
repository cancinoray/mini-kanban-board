import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MockAuthService } from '../services/mockAuthService'
import { useAuthStore } from '../store/useAuthStore'
import { AuthPage } from './AuthPage'

const PASSWORD = 'password123'

describe('AuthPage', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({
      service: new MockAuthService({ usersKey: 'test:auth:users', sessionKey: 'test:auth:session' }),
      user: null,
      status: 'ready',
    })
  })

  it('creates an account and signs the user in', async () => {
    const user = userEvent.setup()
    render(<AuthPage />)

    await user.click(screen.getByRole('button', { name: 'Create an account' }))
    await user.type(screen.getByLabelText('Name'), 'Ray')
    await user.type(screen.getByLabelText('Email'), 'ray@example.com')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(useAuthStore.getState().user?.email).toBe('ray@example.com')
  })

  it('signs in an account created on this device', async () => {
    await useAuthStore.getState().service.register({
      name: 'Ray',
      email: 'ray@example.com',
      password: PASSWORD,
    })
    const user = userEvent.setup()
    render(<AuthPage />)

    await user.type(screen.getByLabelText('Email'), 'ray@example.com')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(useAuthStore.getState().user?.email).toBe('ray@example.com')
  })

  it('says what was wrong when the password does not match', async () => {
    await useAuthStore.getState().service.register({
      name: 'Ray',
      email: 'ray@example.com',
      password: PASSWORD,
    })
    const user = userEvent.setup()
    render(<AuthPage />)

    await user.type(screen.getByLabelText('Email'), 'ray@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('checks the form before asking the service to sign in', async () => {
    const user = userEvent.setup()
    render(<AuthPage />)

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.')
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('requires a password of at least 8 characters when registering', async () => {
    const user = userEvent.setup()
    render(<AuthPage />)

    await user.click(screen.getByRole('button', { name: 'Create an account' }))
    await user.type(screen.getByLabelText('Name'), 'Ray')
    await user.type(screen.getByLabelText('Email'), 'ray@example.com')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Password must be at least 8 characters.')
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('switches between signing in and creating an account', async () => {
    const user = userEvent.setup()
    render(<AuthPage />)

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create an account' }))

    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })
})
