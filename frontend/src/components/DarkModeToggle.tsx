import { useDarkMode } from '../utils/useDarkMode'

export function DarkModeToggle() {
  const { isDark, toggle } = useDarkMode()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-10 w-10 items-center justify-center rounded-md text-text-secondary hover:bg-accent-tint"
    >
      {isDark ? '☀' : '☾'}
    </button>
  )
}
