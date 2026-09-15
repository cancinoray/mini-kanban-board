import { useState, type FormEvent } from 'react'
import { AuthError, type AuthErrorCode } from '../services'
import { useAuthStore } from '../store/useAuthStore'
import { BrandMark } from './BrandMark'
import { DarkModeToggle } from './DarkModeToggle'
import { TagPill } from './TagPill'

type Mode = 'sign-in' | 'register'

/** Service-level rejections, said plainly, in the interface's voice. */
const SERVICE_ERROR: Record<AuthErrorCode, string> = {
  'invalid-credentials': 'Email or password is incorrect.',
  'email-taken': 'An account already exists for this email.',
}

/** What an account is for — shown as the app's own cards, because that's what's waiting on the other side. */
const FIRST_STEPS = [
  { title: 'Create your first board', tag: 'start' },
  { title: 'Add columns and cards', tag: 'start' },
  { title: 'Export a backup any time' },
]

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

interface FieldProps {
  id: string
  label: string
  type: string
  value: string
  autoComplete: string
  onChange: (value: string) => void
  hint?: string
}

function Field({ id, label, type, value, autoComplete, onChange, hint }: FieldProps) {
  return (
    <div className="mt-3 first:mt-0">
      <label htmlFor={id} className="block text-[12px] text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="mt-1 h-10 w-full rounded-md border border-border bg-bg px-2 text-[13px] text-text-primary outline-none"
      />
      {hint && <p className="mt-1 text-[12px] text-text-secondary">{hint}</p>}
    </div>
  )
}

export function AuthPage() {
  const signIn = useAuthStore((s) => s.signIn)
  const register = useAuthStore((s) => s.register)
  const sessionExpired = useAuthStore((s) => s.sessionExpired)

  const [mode, setMode] = useState<Mode>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isRegister = mode === 'register'

  const switchMode = () => {
    setMode(isRegister ? 'sign-in' : 'register')
    setError(null)
    setPassword('')
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()

    if (isRegister && !name.trim()) {
      setError('Enter your name.')
      return
    }
    if (!isEmail(trimmedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    if (isRegister && password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      if (isRegister) await register({ name: name.trim(), email: trimmedEmail, password })
      else await signIn({ email: trimmedEmail, password })
    } catch (err) {
      setError(err instanceof AuthError ? SERVICE_ERROR[err.code] : 'Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitLabel = isRegister ? 'Create account' : 'Sign in'

  return (
    <div className="flex h-screen flex-col bg-bg">
      <header className="flex h-14 items-center justify-between border-b border-border px-4">
        <BrandMark />
        <DarkModeToggle />
      </header>

      <div className="flex flex-1">
        {/* The hero is the product's own first-run checklist, rendered in the product's own vocabulary. */}
        <section
          aria-label="What you can do once you're signed in"
          className="hidden flex-1 border-r border-border p-10 lg:block"
        >
          <div className="w-72">
            <div className="flex items-center gap-2">
              <h2 className="shrink-0 text-[14px] font-medium text-text-primary">Today</h2>
              <span aria-hidden="true" className="mt-1 flex-1 border-b border-dotted border-border" />
            </div>
            <div className="mt-2 border-t border-border" />

            <ul className="mt-2 flex flex-col gap-2">
              {FIRST_STEPS.map((step) => (
                <li key={step.title} className="rounded-md border border-border bg-surface p-3">
                  <p className="text-[14px] text-text-primary">{step.title}</p>
                  {step.tag && (
                    <div className="mt-2">
                      <TagPill label={step.tag} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* The form is a board column: the same header device, and the same card the board itself uses. */}
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-xs">
            <div className="flex items-center gap-2">
              <h1 className="shrink-0 text-[18px] font-medium text-text-primary">
                {isRegister ? 'Create an account' : 'Sign in'}
              </h1>
              <span aria-hidden="true" className="mt-1 flex-1 border-b border-dotted border-border" />
            </div>
            <div className="mt-2 border-t border-border" />

            <form
              onSubmit={onSubmit}
              noValidate
              className="mt-3 rounded-md border border-border bg-surface p-3"
            >
              {sessionExpired && (
                <p role="status" className="mb-3 text-[12px] text-text-secondary">
                  Your session expired. Sign in again.
                </p>
              )}

              {isRegister && (
                <Field
                  id="auth-name"
                  label="Name"
                  type="text"
                  value={name}
                  autoComplete="name"
                  onChange={setName}
                />
              )}
              <Field
                id="auth-email"
                label="Email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={setEmail}
              />
              <Field
                id="auth-password"
                label="Password"
                type="password"
                value={password}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                onChange={setPassword}
                hint={isRegister ? 'At least 8 characters.' : undefined}
              />

              {error && (
                <p role="alert" className="mt-3 text-[12px] text-warning">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-3 h-10 w-full rounded-md bg-accent px-4 text-[13px] text-white disabled:opacity-60"
              >
                {submitting ? `${submitLabel}…` : submitLabel}
              </button>
            </form>

            <p className="mt-3 text-[13px] text-text-secondary">
              {isRegister ? 'Already have an account?' : 'New here?'}{' '}
              <button
                type="button"
                onClick={switchMode}
                className="text-accent underline underline-offset-2"
              >
                {isRegister ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
