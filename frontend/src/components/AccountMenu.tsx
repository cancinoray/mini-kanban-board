import { useAuthStore } from '../store/useAuthStore'

/** Shows who is signed in and ends the session — the one control you need when you're done for the day. */
export function AccountMenu() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  if (!user) return null

  return (
    <div className="flex items-center gap-1">
      <span
        title={user.email}
        className="hidden max-w-32 truncate text-[12px] text-text-secondary sm:block"
      >
        {user.name || user.email}
      </span>
      <button
        type="button"
        onClick={() => signOut()}
        className="h-10 rounded-md px-3 text-[13px] text-text-secondary hover:bg-accent-tint"
      >
        Sign out
      </button>
    </div>
  )
}
